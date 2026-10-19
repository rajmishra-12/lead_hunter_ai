import express from 'express';
import db from '../database/db.js';
import { logger } from '../utils/logger.js';
import { scrapeReddit } from '../scrapers/redditScraper.js';
import { analyzeWithGemini } from '../services/geminiService.js';
import { preFilterCandidate, calculateLeadScore, assignLeadCategory } from '../services/qualifier.js';
import { sendDesktopNotification } from '../services/notifier.js';

const router = express.Router();

// Helper to write JSON chunks to stream
function sendChunk(res, data) {
  res.write(JSON.stringify(data) + '\n');
  if (typeof res.flush === 'function') {
    res.flush();
  }
}

router.post('/', async (req, res) => {
  const startTime = Date.now();
  logger.info('Manual Reddit lead scan initiated across 60 communities.');

  // Set headers for JSON chunk streaming
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Transfer-Encoding', 'chunked');

  if (!process.env.GEMINI_API_KEY) {
    logger.error('GEMINI_API_KEY is not configured in backend/.env');
    sendChunk(res, { phase: 'error', message: 'Scan failed: GEMINI_API_KEY is not configured in backend/.env', progress: 0 });
    res.end();
    return;
  }

  let redditLeads = [];

  try {
    // Phase 1: Scanning 200+ Active Reddit Communities
    sendChunk(res, { phase: 'reddit', message: 'Scanning 200+ Reddit developer, startup & gig communities...', progress: 10 });
    try {
      redditLeads = await scrapeReddit((progressUpdate) => {
        sendChunk(res, progressUpdate);
      });
    } catch (err) {
      logger.error(`Scan error in Reddit scraper: ${err.message}`);
    }

    // Collect all posts (Reddit exclusive)
    const allPosts = redditLeads;
    const totalScanned = allPosts.length;

    // Deduplicate against incoming batch and existing database
    const uniquePosts = [];
    const seenUrls = new Set();
    const seenIds = new Set();
    const checkDuplicate = db.prepare('SELECT id FROM leads WHERE id = ? OR url = ?');

    for (const post of allPosts) {
      if (!post.url || seenUrls.has(post.url) || seenIds.has(post.id)) continue;
      seenUrls.add(post.url);
      seenIds.add(post.id);

      const existing = checkDuplicate.get(post.id, post.url);
      if (!existing) {
        uniquePosts.push(post);
      }
    }

    const newPostsCount = uniquePosts.length;
    logger.info(`Scan collected ${totalScanned} total posts. Found ${newPostsCount} new posts after duplicate check.`);

    let qualifiedOpportunities = 0;

    // Phase 5: Semantic Qualification with Gemini & Deterministic Rules
    if (newPostsCount > 0) {
      const insertLead = db.prepare(`
        INSERT INTO leads (
          id, title, description, url, author, created_time, 
          estimated_budget, technology, platform, location, company, 
          source, score, ai_summary, ai_risks, ai_estimated_hours, 
          ai_suggested_tech, status,
          intent_category, hiring_intent_score, confidence_score, 
          confidence_reason, client_type, extracted_technologies, urgency_level,
          opportunity_type, is_potential_client, raw_gemini_json,
          budget_min_usd, budget_max_usd, budget_status, author_intent,
          engagement_type, payment_status, scope_clarity, recommended_action,
          exclusion_reason, qualification_category, is_development_related, is_hiring
        ) VALUES (
          @id, @title, @description, @url, @author, @created_time, 
          @estimated_budget, @technology, @platform, @location, @company, 
          @source, @score, @ai_summary, @ai_risks, @ai_estimated_hours, 
          @ai_suggested_tech, @status,
          @intent_category, @hiring_intent_score, @confidence_score, 
          @confidence_reason, @client_type, @extracted_technologies, @urgency_level,
          @opportunity_type, @is_potential_client, @raw_gemini_json,
          @budget_min_usd, @budget_max_usd, @budget_status, @author_intent,
          @engagement_type, @payment_status, @scope_clarity, @recommended_action,
          @exclusion_reason, @qualification_category, @is_development_related, @is_hiring
        )
      `);

      for (let i = 0; i < newPostsCount; i++) {
        const post = uniquePosts[i];
        const currentProgress = 50 + Math.floor((i / newPostsCount) * 35);
        sendChunk(res, { 
          phase: 'gemini', 
          message: `Qualifying lead (${i + 1}/${newPostsCount}): "${(post.title || '').substring(0, 30)}..."`, 
          progress: currentProgress 
        });

        // 1. Deterministic Pre-filter check (fast reject for obvious noise, self-promotion, stale)
        const preCheck = preFilterCandidate(post);
        if (!preCheck.pass) {
          logger.info(`Pre-filter excluded: "${post.title.substring(0, 40)}" Reason: ${preCheck.reason}`);
          try {
            insertLead.run({
              id: post.id,
              title: post.title,
              description: post.description || '',
              url: post.url,
              author: post.author || 'Anonymous',
              created_time: post.created_time || Math.floor(Date.now() / 1000),
              estimated_budget: 0,
              technology: post.technology || 'General',
              platform: post.platform || 'General',
              location: post.location || 'Remote',
              company: post.company || 'Unknown',
              source: post.source,
              score: 0,
              ai_summary: preCheck.reason,
              ai_risks: 'Excluded by deterministic rules',
              ai_estimated_hours: 0,
              ai_suggested_tech: post.technology || 'None',
              status: 'New',
              intent_category: 'Excluded',
              hiring_intent_score: 0,
              confidence_score: 95,
              confidence_reason: preCheck.reason,
              client_type: 'Unknown',
              extracted_technologies: post.technology || 'None',
              urgency_level: 'Low',
              opportunity_type: 'Ignore',
              is_potential_client: 0,
              raw_gemini_json: null,
              budget_min_usd: 0,
              budget_max_usd: 0,
              budget_status: 'unpaid',
              author_intent: 'unrelated',
              engagement_type: 'other',
              payment_status: 'unpaid_or_equity',
              scope_clarity: 'low',
              recommended_action: 'Discard. Irrelevant posting.',
              exclusion_reason: preCheck.reason,
              qualification_category: 'rejected',
              is_development_related: 0,
              is_hiring: 0
            });
          } catch (e) {
            logger.error(`Error saving pre-filtered post: ${e.message}`);
          }
          continue;
        }

        // Delay between Gemini calls to respect API limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        try {
          const geminiResult = await analyzeWithGemini(post.title, post.description, post);
          const { score, isQualified, exclusionReason } = calculateLeadScore(geminiResult, post);
          const category = assignLeadCategory(score, geminiResult, isQualified);
          const isPotentialClient = isQualified ? 1 : 0;

          if (isPotentialClient === 1 && category !== 'rejected') {
            qualifiedOpportunities++;
          }

          const extractedTech = (geminiResult.required_skills && geminiResult.required_skills.length > 0)
            ? geminiResult.required_skills.join(', ')
            : (post.technology || 'General');

          const budgetValue = geminiResult.budget_max_usd || geminiResult.budget_min_usd || post.estimated_budget || 0;

          const enrichedLead = {
            id: post.id,
            title: post.title,
            description: post.description || '',
            url: post.url,
            author: post.author || 'Anonymous',
            created_time: post.created_time || Math.floor(Date.now() / 1000),
            estimated_budget: budgetValue,
            technology: extractedTech,
            platform: post.platform || 'General',
            location: post.location || 'Remote',
            company: post.company || 'Client',
            source: post.source,
            score: score,
            ai_summary: geminiResult.project_summary || '',
            ai_risks: geminiResult.payment_status === 'unpaid_or_equity' ? 'High risk (Equity/Unpaid)' : 'Verified project',
            ai_estimated_hours: budgetValue > 5000 ? 160 : (budgetValue > 1000 ? 80 : 40),
            ai_suggested_tech: extractedTech,
            status: 'New',
            intent_category: geminiResult.author_intent === 'buyer' ? 'Buying Services' : 'Other',
            hiring_intent_score: score,
            confidence_score: 90,
            confidence_reason: geminiResult.qualification_reason || '',
            client_type: geminiResult.engagement_type === 'agency_subcontract' ? 'Agency' : 'Client',
            extracted_technologies: extractedTech,
            urgency_level: (geminiResult.urgency || 'Medium').charAt(0).toUpperCase() + (geminiResult.urgency || 'medium').slice(1),
            opportunity_type: geminiResult.engagement_type || 'direct_freelance',
            is_potential_client: isPotentialClient,
            raw_gemini_json: JSON.stringify(geminiResult),
            budget_min_usd: geminiResult.budget_min_usd || 0,
            budget_max_usd: geminiResult.budget_max_usd || 0,
            budget_status: geminiResult.budget_status || 'unknown',
            author_intent: geminiResult.author_intent || 'buyer',
            engagement_type: geminiResult.engagement_type || 'direct_freelance',
            payment_status: geminiResult.payment_status || 'paid_or_budgeted',
            scope_clarity: geminiResult.scope_clarity || 'medium',
            recommended_action: geminiResult.recommended_action || 'Contact client with relevant portfolio.',
            exclusion_reason: exclusionReason || geminiResult.exclusion_reason || null,
            qualification_category: category,
            is_development_related: geminiResult.is_development_related ? 1 : 0,
            is_hiring: geminiResult.is_hiring ? 1 : 0
          };

          insertLead.run(enrichedLead);

          // Desktop Notification if high priority
          if (isPotentialClient === 1 && score >= 75) {
            sendDesktopNotification(enrichedLead);
          }

        } catch (geminiErr) {
          logger.error(`Failed to analyze lead "${post.title}" with Gemini: ${geminiErr.message}`);
          // NEVER mark an unclassified post as a qualified lead by default!
          try {
            insertLead.run({
              id: post.id,
              title: post.title,
              description: post.description || '',
              url: post.url,
              author: post.author || 'Anonymous',
              created_time: post.created_time || Math.floor(Date.now() / 1000),
              estimated_budget: post.estimated_budget || 0,
              technology: post.technology || 'General',
              platform: post.platform || 'General',
              location: post.location || 'Remote',
              company: post.company || 'Unknown',
              source: post.source,
              score: 45,
              ai_summary: 'AI analysis encountered a temporary network issue. Needs manual inspection.',
              ai_risks: 'Unverified',
              ai_estimated_hours: 40,
              ai_suggested_tech: post.technology || 'General',
              status: 'New',
              intent_category: 'Unverified',
              hiring_intent_score: 45,
              confidence_score: 40,
              confidence_reason: 'Automated AI qualification was unavailable.',
              client_type: 'Unknown',
              extracted_technologies: post.technology || 'General',
              urgency_level: 'Medium',
              opportunity_type: 'Other',
              is_potential_client: 0, // NOT qualified by default!
              raw_gemini_json: null,
              budget_min_usd: 0,
              budget_max_usd: 0,
              budget_status: 'unknown',
              author_intent: 'buyer',
              engagement_type: 'other',
              payment_status: 'ambiguous',
              scope_clarity: 'low',
              recommended_action: 'Manually review original posting.',
              exclusion_reason: 'AI service timeout or limit reached during scan.',
              qualification_category: 'manual_review',
              is_development_related: 1,
              is_hiring: 1
            });
          } catch (dbErr) {
            logger.error(`Database fallback insertion failed: ${dbErr.message}`);
          }
        }
      }
    } else {
      sendChunk(res, { phase: 'gemini', message: 'No new posts to analyze.', progress: 85 });
    }

    // Phase 6: Saving database & Updating Statistics
    sendChunk(res, { phase: 'saving', message: 'Updating analytics...', progress: 90 });
    
    const scanDuration = Math.round((Date.now() - startTime) / 1000);
    const filteredPosts = Math.max(0, totalScanned - qualifiedOpportunities);
    const lastScanTime = Math.floor(Date.now() / 1000);

    // Record stats in the settings table
    const updateSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    updateSetting.run('lastScanTotalScanned', String(totalScanned));
    updateSetting.run('lastScanQualified', String(qualifiedOpportunities));
    updateSetting.run('lastScanFiltered', String(filteredPosts));
    updateSetting.run('lastScanDuration', String(scanDuration));
    updateSetting.run('lastScanTime', String(lastScanTime));

    // Phase 7: Refreshing dashboard
    sendChunk(res, { 
      phase: 'refreshing', 
      message: 'Refreshing dashboard...', 
      progress: 100,
      stats: {
        totalScanned,
        qualifiedOpportunities,
        filteredPosts,
        scanDuration
      }
    });

    res.end();
  } catch (error) {
    logger.error(`Unexpected scan error: ${error.message}`);
    sendChunk(res, { phase: 'error', message: `Scan error: ${error.message}`, progress: 0 });
    res.end();
  }
});

export default router;

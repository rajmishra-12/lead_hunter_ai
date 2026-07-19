import express from 'express';
import db from '../database/db.js';
import { logger } from '../utils/logger.js';
import { scrapeReddit } from '../scrapers/redditScraper.js';
import { scrapeHackerNews } from '../scrapers/hnScraper.js';
import { scrapeRemoteOK } from '../scrapers/remoteokScraper.js';
import { scrapeDevTo } from '../scrapers/othersScraper.js';
import { analyzeWithGemini } from '../services/geminiService.js';
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
  logger.info('Manual lead scan initiated.');

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
  let hnLeads = [];
  let remoteokLeads = [];
  let devtoLeads = [];

  try {
    // Phase 1: Scanning Reddit
    sendChunk(res, { phase: 'reddit', message: 'Scanning Reddit...', progress: 10 });
    try {
      redditLeads = await scrapeReddit();
    } catch (err) {
      logger.error(`Scan error in Reddit scraper: ${err.message}`);
    }

    // Phase 2: Scanning Hacker News
    sendChunk(res, { phase: 'hn', message: 'Scanning Hacker News...', progress: 25 });
    try {
      hnLeads = await scrapeHackerNews();
    } catch (err) {
      logger.error(`Scan error in Hacker News scraper: ${err.message}`);
    }

    // Phase 3: Scanning RemoteOK
    sendChunk(res, { phase: 'remoteok', message: 'Scanning RemoteOK...', progress: 40 });
    try {
      remoteokLeads = await scrapeRemoteOK();
    } catch (err) {
      logger.error(`Scan error in RemoteOK scraper: ${err.message}`);
    }

    // Phase 4: Scanning Dev.to
    sendChunk(res, { phase: 'devto', message: 'Scanning Dev.to...', progress: 50 });
    try {
      devtoLeads = await scrapeDevTo();
    } catch (err) {
      logger.error(`Scan error in Dev.to scraper: ${err.message}`);
    }

    // Collect all posts
    const allPosts = [...redditLeads, ...hnLeads, ...remoteokLeads, ...devtoLeads];
    const totalScanned = allPosts.length;

    // Remove duplicates
    const uniquePosts = [];
    const seenUrls = new Set();
    const seenIds = new Set();
    const checkDuplicate = db.prepare('SELECT id FROM leads WHERE id = ? OR url = ?');

    for (const post of allPosts) {
      if (seenUrls.has(post.url) || seenIds.has(post.id)) continue;
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

    // Phase 5: Analyzing with Gemini
    if (newPostsCount > 0) {
      const insertLead = db.prepare(`
        INSERT INTO leads (
          id, title, description, url, author, created_time, 
          estimated_budget, technology, platform, location, company, 
          source, score, ai_summary, ai_risks, ai_estimated_hours, 
          ai_suggested_tech, status,
          intent_category, hiring_intent_score, confidence_score, 
          confidence_reason, client_type, extracted_technologies, urgency_level,
          opportunity_type, is_potential_client, raw_gemini_json
        ) VALUES (
          @id, @title, @description, @url, @author, @created_time, 
          @estimated_budget, @technology, @platform, @location, @company, 
          @source, @score, @ai_summary, @ai_risks, @ai_estimated_hours, 
          @ai_suggested_tech, @status,
          @intent_category, @hiring_intent_score, @confidence_score, 
          @confidence_reason, @client_type, @extracted_technologies, @urgency_level,
          @opportunity_type, @is_potential_client, @raw_gemini_json
        )
      `);

      for (let i = 0; i < newPostsCount; i++) {
        const post = uniquePosts[i];
        const currentProgress = 50 + Math.floor((i / newPostsCount) * 35);
        sendChunk(res, { 
          phase: 'gemini', 
          message: `Analyzing with Gemini (${i + 1}/${newPostsCount})...`, 
          progress: currentProgress 
        });

        // Delay to avoid hitting free-tier 15 RPM limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        try {
          const geminiResult = await analyzeWithGemini(post.title, post.description);
          
          // Map Gemini response to SQLite schema
          const isPotentialClient = geminiResult.potentialClient === 'Yes' ? 1 : 0;
          if (isPotentialClient === 1) {
            qualifiedOpportunities++;
          }

          const extractedTech = geminiResult.requiredSkills.join(', ') || 'General';
          const platform = geminiResult.requiredSkills.some(skill => 
            ['flutter', 'react native', 'reactnative', 'xamarin', 'maui'].includes(skill.toLowerCase())
          ) ? 'Cross-Platform' : 'Mobile (General)';

          const score = geminiResult.hiringScore;
          
          // Estimated hours heuristic
          let estimatedHours = 80;
          if (geminiResult.budget > 5000) estimatedHours = 180;
          else if (geminiResult.budget > 0 && geminiResult.budget < 1500) estimatedHours = 30;

          // Deriving risks
          let risks = 'None detected';
          if (post.description.toLowerCase().includes('equity only') || post.description.toLowerCase().includes('rev share')) {
            risks = 'High risk (Equity / Revenue share offer)';
          }

          const enrichedLead = {
            id: post.id,
            title: post.title,
            description: post.description,
            url: post.url,
            author: post.author || 'Anonymous',
            created_time: post.created_time,
            estimated_budget: geminiResult.budget || 0,
            technology: extractedTech,
            platform: platform,
            location: post.location || 'Remote',
            company: post.company || geminiResult.posterType || 'Client',
            source: post.source,
            score: score,
            ai_summary: geminiResult.summary,
            ai_risks: risks,
            ai_estimated_hours: estimatedHours,
            ai_suggested_tech: extractedTech,
            status: 'New',
            intent_category: geminiResult.intent,
            hiring_intent_score: score,
            confidence_score: 90,
            confidence_reason: geminiResult.classificationReason,
            client_type: geminiResult.posterType,
            extracted_technologies: extractedTech,
            urgency_level: geminiResult.urgency,
            opportunity_type: geminiResult.intent === 'Hiring' ? 'Job' : (geminiResult.intent === 'Buying Services' ? 'Contract' : 'Other'),
            is_potential_client: isPotentialClient,
            raw_gemini_json: JSON.stringify(geminiResult)
          };

          insertLead.run(enrichedLead);
          
          // Desktop Notification if high score
          if (isPotentialClient === 1) {
            sendDesktopNotification(enrichedLead);
          }

        } catch (geminiErr) {
          logger.error(`Failed to analyze lead "${post.title}" with Gemini: ${geminiErr.message}`);
          // Fallback to local heuristic saving if Gemini fails so we don't drop leads completely
          try {
            const fallbackInsert = db.prepare(`
              INSERT INTO leads (id, title, description, url, author, created_time, source, status, is_potential_client)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'New', 1)
            `);
            fallbackInsert.run(post.id, post.title, post.description, post.url, post.author, post.created_time, post.source);
            qualifiedOpportunities++;
          } catch (dbErr) {
            logger.error(`Database fallback insertion failed: ${dbErr.message}`);
          }
        }
      }
    } else {
      sendChunk(res, { phase: 'gemini', message: 'Analyzing with Gemini...', progress: 85 });
    }

    // Phase 6: Saving database
    sendChunk(res, { phase: 'saving', message: 'Saving database...', progress: 90 });
    
    const scanDuration = Math.round((Date.now() - startTime) / 1000);
    const filteredPosts = totalScanned - qualifiedOpportunities;
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
        scanDuration,
        lastScanTime
      }
    });

    res.end();

  } catch (err) {
    logger.error(`Scan execution failed: ${err.message}`);
    sendChunk(res, { phase: 'error', message: `Scan failed: ${err.message}`, progress: 0 });
    res.end();
  }
});

export default router;

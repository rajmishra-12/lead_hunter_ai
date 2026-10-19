import db from '../database/db.js';
import { logger } from '../utils/logger.js';
import { scrapeReddit } from './redditScraper.js';
import { sendDesktopNotification } from '../services/notifier.js';
import { analyzeLead } from '../services/analyzer.js';
import { preFilterCandidate } from '../services/qualifier.js';

export async function runScrapers() {
  logger.info('Starting Reddit lead scraping cycle across 60 active groups...');

  let allNewLeads = [];

  try {
    const redditLeads = await scrapeReddit();
    allNewLeads.push(...redditLeads);
    recordHistory('reddit', redditLeads.length, 'SUCCESS', null);
  } catch (err) {
    recordHistory('reddit', 0, 'ERROR', err.message);
  }

  // Insert unique leads to DB
  let insertedCount = 0;
  const checkDuplicate = db.prepare('SELECT id FROM leads WHERE id = ? OR url = ?');
  const insertLead = db.prepare(`
    INSERT INTO leads (
      id, title, description, url, author, created_time, 
      estimated_budget, technology, platform, location, company, 
      source, score, ai_summary, ai_risks, ai_estimated_hours, 
      ai_suggested_tech, status,
      intent_category, hiring_intent_score, confidence_score, 
      confidence_reason, client_type, extracted_technologies, urgency_level,
      opportunity_type, is_potential_client,
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
      @opportunity_type, @is_potential_client,
      @budget_min_usd, @budget_max_usd, @budget_status, @author_intent,
      @engagement_type, @payment_status, @scope_clarity, @recommended_action,
      @exclusion_reason, @qualification_category, @is_development_related, @is_hiring
    )
  `);

  for (let lead of allNewLeads) {
    const existing = checkDuplicate.get(lead.id, lead.url);
    if (!existing) {
      try {
        const analysis = analyzeLead(lead.title, lead.description);
        const budgetVal = analysis.estimatedBudget || 0;
        const bStatus = budgetVal >= 1000 ? 'confirmed' : (budgetVal > 0 ? 'below_1000' : 'unknown');
        const isClient = analysis.is_potential_client === 1;

        let category = 'manual_review';
        if (!isClient) category = 'rejected';
        else if (analysis.score >= 75 && budgetVal >= 1000) category = 'high_priority';
        else if (bStatus === 'unknown') category = 'budget_unknown';

        const enrichedLead = {
          ...lead,
          estimated_budget: budgetVal,
          technology: analysis.technology,
          platform: analysis.platform,
          score: analysis.score,
          ai_summary: analysis.summary,
          ai_risks: analysis.risks,
          ai_estimated_hours: analysis.estimatedHours,
          ai_suggested_tech: analysis.suggestedTech,
          intent_category: analysis.intent_category,
          hiring_intent_score: analysis.hiring_intent_score,
          confidence_score: analysis.confidence_score,
          confidence_reason: analysis.confidence_reason,
          client_type: analysis.client_type,
          extracted_technologies: analysis.extracted_technologies,
          urgency_level: analysis.urgency_level,
          opportunity_type: analysis.opportunity_type,
          is_potential_client: analysis.is_potential_client,
          budget_min_usd: budgetVal,
          budget_max_usd: budgetVal,
          budget_status: bStatus,
          author_intent: isClient ? 'buyer' : 'unrelated',
          engagement_type: analysis.opportunity_type === 'Contract' ? 'direct_freelance' : 'other',
          payment_status: budgetVal > 0 ? 'paid_or_budgeted' : 'budget_unknown',
          scope_clarity: 'medium',
          recommended_action: 'Review lead requirements and reach out.',
          exclusion_reason: isClient ? null : 'Filtered out by intent rules.',
          qualification_category: category,
          is_development_related: 1,
          is_hiring: isClient ? 1 : 0
        };

        insertLead.run(enrichedLead);
        insertedCount++;
        // Send desktop notification
        if (isClient && analysis.score >= 75) {
          sendDesktopNotification(enrichedLead);
        }
      } catch (err) {
        logger.error(`Failed to insert lead ${lead.url}: ${err.message}`);
      }
    }
  }

  logger.success(`Scrape complete. Discovered ${allNewLeads.length} leads. Added ${insertedCount} new entries to SQLite.`);
  return insertedCount;
}

function recordHistory(source, count, status, errorMsg) {
  try {
    const stmt = db.prepare(`
      INSERT INTO scraper_history (source, leads_found, status, error_message)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(source, count, status, errorMsg);
  } catch (err) {
    logger.error(`Failed to record scraper history: ${err.message}`);
  }
}

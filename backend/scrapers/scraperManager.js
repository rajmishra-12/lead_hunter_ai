import db from '../database/db.js';
import { logger } from '../utils/logger.js';
import { scrapeReddit } from './redditScraper.js';
import { scrapeHackerNews } from './hnScraper.js';
import { scrapeRemoteOK } from './remoteokScraper.js';
import { scrapeDevTo, scrapeGitHubDiscussions, scrapeWellfound } from './othersScraper.js';
import { sendDesktopNotification } from '../services/notifier.js';

export async function runScrapers() {
  logger.info('Starting lead scraping cycle...');

  // Fetch enabled sources from DB settings
  const sourceSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('sources');
  const enabledSources = sourceSetting ? sourceSetting.value.split(',') : [];

  logger.info(`Enabled sources for scraping: ${enabledSources.join(', ')}`);

  let allNewLeads = [];

  // Run scrapers dynamically
  if (enabledSources.includes('reddit')) {
    try {
      const redditLeads = await scrapeReddit();
      allNewLeads.push(...redditLeads);
      recordHistory('reddit', redditLeads.length, 'SUCCESS', null);
    } catch (err) {
      recordHistory('reddit', 0, 'ERROR', err.message);
    }
  }

  if (enabledSources.includes('hn')) {
    try {
      const hnLeads = await scrapeHackerNews();
      allNewLeads.push(...hnLeads);
      recordHistory('hn', hnLeads.length, 'SUCCESS', null);
    } catch (err) {
      recordHistory('hn', 0, 'ERROR', err.message);
    }
  }

  if (enabledSources.includes('remoteok')) {
    try {
      const remoteokLeads = await scrapeRemoteOK();
      allNewLeads.push(...remoteokLeads);
      recordHistory('remoteok', remoteokLeads.length, 'SUCCESS', null);
    } catch (err) {
      recordHistory('remoteok', 0, 'ERROR', err.message);
    }
  }

  if (enabledSources.includes('devto')) {
    try {
      const devtoLeads = await scrapeDevTo();
      allNewLeads.push(...devtoLeads);
      recordHistory('devto', devtoLeads.length, 'SUCCESS', null);
    } catch (err) {
      recordHistory('devto', 0, 'ERROR', err.message);
    }
  }

  if (enabledSources.includes('github')) {
    try {
      const githubLeads = await scrapeGitHubDiscussions();
      allNewLeads.push(...githubLeads);
      recordHistory('github', githubLeads.length, 'SUCCESS', null);
    } catch (err) {
      recordHistory('github', 0, 'ERROR', err.message);
    }
  }

  if (enabledSources.includes('wellfound')) {
    try {
      const wellfoundLeads = await scrapeWellfound();
      allNewLeads.push(...wellfoundLeads);
      recordHistory('wellfound', wellfoundLeads.length, 'SUCCESS', null);
    } catch (err) {
      recordHistory('wellfound', 0, 'ERROR', err.message);
    }
  }

  // Insert unique leads to DB
  let insertedCount = 0;
  const checkDuplicate = db.prepare('SELECT id FROM leads WHERE id = ? OR url = ?');
  const insertLead = db.prepare(`
    INSERT INTO leads (
      id, title, description, url, author, created_time, 
      estimated_budget, technology, platform, location, company, 
      source, score, ai_summary, ai_risks, ai_estimated_hours, 
      ai_suggested_tech, status
    ) VALUES (
      @id, @title, @description, @url, @author, @created_time, 
      @estimated_budget, @technology, @platform, @location, @company, 
      @source, @score, @ai_summary, @ai_risks, @ai_estimated_hours, 
      @ai_suggested_tech, @status
    )
  `);

  for (const lead of allNewLeads) {
    const existing = checkDuplicate.get(lead.id, lead.url);
    if (!existing) {
      try {
        insertLead.run(lead);
        insertedCount++;
        // Send desktop notification
        sendDesktopNotification(lead);
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

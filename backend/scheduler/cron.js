import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { runScrapers } from '../scrapers/scraperManager.js';

export function initScheduler() {
  logger.info('Initializing LeadHunter AI Scraper Scheduler...');

  // Run immediately on boot in the background (after short delay)
  setTimeout(() => {
    logger.info('Running initial startup scraping cycle...');
    runScrapers().catch(err => {
      logger.error(`Startup scraping cycle failed: ${err.message}`);
    });
  }, 3000);

  // Run every 5 minutes: '*/5 * * * *'
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Triggering scheduled cron scraping cycle...');
    try {
      const added = await runScrapers();
      logger.success(`Scheduled scraping complete. Added ${added} new leads.`);
    } catch (err) {
      logger.error(`Scheduled scraping cycle encountered an error: ${err.message}`);
    }
  });

  logger.success('Scheduler configured to execute every 5 minutes.');
}

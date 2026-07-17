import axios from 'axios';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';

export async function scrapeRemoteOK() {
  logger.scraper('remoteok', 'Starting RemoteOK scrape...');
  const leads = [];

  try {
    const url = 'https://remoteok.com/api';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    if (!Array.isArray(response.data)) {
      logger.scraper('remoteok', 'Invalid response from RemoteOK API');
      return leads;
    }

    // First item in RemoteOK is a legal disclaimer/info, so skip index 0
    const jobs = response.data.slice(1);
    logger.scraper('remoteok', `Found ${jobs.length} jobs on RemoteOK`);

    for (const job of jobs) {
      if (!job.position || !job.description) continue;

      const titleLower = job.position.toLowerCase();
      const descLower = job.description.toLowerCase();
      
      // Filter for mobile development
      const isMobile = titleLower.includes('flutter') || 
                       titleLower.includes('react native') || 
                       titleLower.includes('reactnative') || 
                       titleLower.includes('ios') || 
                       titleLower.includes('android') || 
                       titleLower.includes('mobile');

      if (!isMobile) continue;

      const leadId = `remoteok_${job.id}`;
      const plainDesc = job.description.replace(/<[^>]*>/g, ' '); // Strip HTML
      const analysis = analyzeLead(job.position, plainDesc);

      // Extract budget if present in salary/budget fields
      let budgetVal = analysis.estimatedBudget;
      if (job.salary_min) {
        budgetVal = parseFloat(job.salary_min);
      }

      leads.push({
        id: leadId,
        title: job.position,
        description: plainDesc,
        url: job.url,
        author: job.company || 'RemoteOK Hirer',
        created_time: job.date ? Math.floor(new Date(job.date).getTime() / 1000) : Math.floor(Date.now() / 1000),
        estimated_budget: budgetVal,
        technology: analysis.technology,
        platform: analysis.platform,
        location: job.location || 'Remote',
        company: job.company || 'Remote Startup',
        source: 'RemoteOK',
        score: analysis.score,
        ai_summary: analysis.summary,
        ai_risks: analysis.risks,
        ai_estimated_hours: analysis.estimatedHours,
        ai_suggested_tech: analysis.suggestedTech,
        status: 'New'
      });
    }

  } catch (error) {
    logger.error(`Error scraping RemoteOK: ${error.message}. Returning empty leads list.`);
  }

  logger.scraper('remoteok', `Completed RemoteOK scraping. Extracted ${leads.length} mobile leads.`);
  return leads;
}

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';

export async function scrapeDevTo() {
  logger.scraper('devto', 'Starting Dev.to scrape...');
  const leads = [];
  try {
    // Dev.to listings API
    const response = await axios.get('https://dev.to/api/listings?limit=20', {
      headers: { 'User-Agent': 'Mozilla/5.0 LeadhunterAI' }
    });

    if (!Array.isArray(response.data)) return leads;

    for (const listing of response.data) {
      const titleLower = listing.title.toLowerCase();
      const bodyLower = (listing.body_markdown || '').toLowerCase();

      // Check if it's mobile app hiring
      const isMobile = titleLower.includes('flutter') || 
                       titleLower.includes('react native') || 
                       titleLower.includes('ios') || 
                       titleLower.includes('android') || 
                       bodyLower.includes('hiring') || 
                       bodyLower.includes('freelance');

      if (!isMobile) continue;

      const analysis = analyzeLead(listing.title, listing.body_markdown || '');
      leads.push({
        id: `devto_${listing.id}`,
        title: listing.title,
        description: listing.body_markdown || '',
        url: `https://dev.to/listings/${listing.slug}`,
        author: listing.user?.name || 'Dev.to Author',
        created_time: Math.floor(new Date(listing.created_at).getTime() / 1000),
        estimated_budget: analysis.estimatedBudget || 1200,
        technology: analysis.technology,
        platform: analysis.platform,
        location: 'Remote',
        company: listing.organization?.name || 'Dev.to Member',
        source: 'Dev.to Jobs',
        score: analysis.score,
        ai_summary: analysis.summary,
        ai_risks: analysis.risks,
        ai_estimated_hours: analysis.estimatedHours,
        ai_suggested_tech: analysis.suggestedTech,
        status: 'New'
      });
    }
  } catch (error) {
    logger.error(`Error scraping Dev.to: ${error.message}`);
  }
  return leads;
}

export async function scrapeGitHubDiscussions() {
  logger.scraper('github', 'Starting GitHub Discussions scrape (Mock generator disabled)...');
  return [];
}

export async function scrapeWellfound() {
  logger.scraper('wellfound', 'Starting Wellfound scrape (Mock generator disabled)...');
  return [];
}

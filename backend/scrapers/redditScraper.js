import axios from 'axios';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';

const SUBREDDITS = [
  'forhire',
  'slavelabour',
  'startups',
  'Entrepreneur',
  'reactnative',
  'flutterdev',
  'webdev'
];

export async function scrapeReddit() {
  logger.scraper('reddit', 'Starting Reddit scrape...');
  const leads = [];

  for (const subreddit of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=15`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 LeadhunterAI/1.0'
        }
      });

      if (!response.data || !response.data.data || !response.data.data.children) {
        logger.scraper('reddit', `Invalid response format for r/${subreddit}`);
        continue;
      }

      const posts = response.data.data.children;
      logger.scraper('reddit', `Found ${posts.length} posts in r/${subreddit}`);

      for (const post of posts) {
        const data = post.data;
        
        // Skip stickied posts
        if (data.stickied) continue;

        // We only want hiring posts or posts looking for developers.
        // On forhire, titles usually start with [Hiring]. On other subs, it can be general.
        const titleLower = data.title.toLowerCase();
        const bodyLower = (data.selftext || '').toLowerCase();
        
        // Filter: Must look like a hiring opportunity, especially mobile apps
        const isHiring = titleLower.includes('hiring') || 
                         titleLower.includes('looking for') || 
                         titleLower.includes('need') || 
                         bodyLower.includes('hiring') || 
                         bodyLower.includes('looking for developer');
                         
        if (!isHiring) continue;

        const leadId = `reddit_${data.id}`;
        
        // Run AI Analysis (local heuristic-based)
        const analysis = analyzeLead(data.title, data.selftext || '');

        leads.push({
          id: leadId,
          title: data.title,
          description: data.selftext || '',
          url: `https://www.reddit.com${data.permalink}`,
          author: data.author,
          created_time: data.created_utc,
          estimated_budget: analysis.estimatedBudget,
          technology: analysis.technology,
          platform: analysis.platform,
          location: data.link_flair_text || 'Remote',
          company: 'Reddit Client',
          source: `reddit/r/${subreddit}`,
          score: analysis.score,
          ai_summary: analysis.summary,
          ai_risks: analysis.risks,
          ai_estimated_hours: analysis.estimatedHours,
          ai_suggested_tech: analysis.suggestedTech,
          status: 'New'
        });
      }
    } catch (error) {
      logger.error(`Error scraping r/${subreddit}: ${error.message}`);
    }
  }

  logger.scraper('reddit', `Completed Reddit scraping. Extracted ${leads.length} mobile/hiring leads.`);
  return leads;
}

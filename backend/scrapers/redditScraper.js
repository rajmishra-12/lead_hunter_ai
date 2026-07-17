import axios from 'axios';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';
import { SUBREDDITS, KEYWORDS } from './redditConstants.js';

export async function scrapeReddit() {
  logger.scraper('reddit', `Starting Reddit scrape of ${SUBREDDITS.length} subreddits via PullPush API...`);
  const leads = [];

  for (let i = 0; i < SUBREDDITS.length; i++) {
    const subreddit = SUBREDDITS[i];
    try {
      const url = `https://api.pullpush.io/reddit/search/submission/?subreddit=${subreddit}&limit=10`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 5000
      });

      if (response.data && response.data.data) {
        const posts = response.data.data;
        logger.scraper('reddit', `[${i + 1}/${SUBREDDITS.length}] Successfully crawled r/${subreddit}. Found ${posts.length} posts.`);

        for (const post of posts) {
          // Skip if body was removed/deleted
          if (post.selftext === '[removed]' || post.selftext === '[deleted]') continue;

          const titleLower = post.title.toLowerCase();
          const bodyLower = (post.selftext || '').toLowerCase();
          
          // Match against the comprehensive keywords list
          const matchesKeyword = KEYWORDS.some(kw => titleLower.includes(kw) || bodyLower.includes(kw));
          if (!matchesKeyword) continue;

          const leadId = `reddit_${post.id}`;
          const analysis = analyzeLead(post.title, post.selftext || '');

          leads.push({
            id: leadId,
            title: post.title,
            description: post.selftext || '',
            url: `https://www.reddit.com${post.permalink}`,
            author: post.author || 'anonymous',
            created_time: post.created_utc || Math.floor(Date.now() / 1000),
            estimated_budget: analysis.estimatedBudget,
            technology: analysis.technology,
            platform: analysis.platform,
            location: 'Remote',
            company: 'Reddit Client',
            source: `reddit/r/${post.subreddit}`,
            score: analysis.score,
            ai_summary: analysis.summary,
            ai_risks: analysis.risks,
            ai_estimated_hours: analysis.estimatedHours,
            ai_suggested_tech: analysis.suggestedTech,
            status: 'New'
          });
        }
      }
    } catch (error) {
      logger.error(`Error scraping r/${subreddit} via PullPush: ${error.message}`);
    }

    // Delay of 1.5 seconds to prevent PullPush 429 rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  logger.scraper('reddit', `Completed Reddit scraping. Extracted ${leads.length} mobile/hiring leads.`);
  return leads;
}

import { chromium } from 'playwright';
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
  logger.scraper('reddit', 'Starting Reddit scrape via Playwright browser...');
  const leads = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    for (const subreddit of SUBREDDITS) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=15`;
        logger.scraper('reddit', `Navigating to r/${subreddit} JSON endpoint...`);
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const jsonText = await page.innerText('body');
        const data = JSON.parse(jsonText);

        if (!data || !data.data || !data.data.children) {
          logger.scraper('reddit', `Invalid response format for r/${subreddit}`);
          continue;
        }

        const posts = data.data.children;
        logger.scraper('reddit', `Found ${posts.length} posts in r/${subreddit}`);

        for (const post of posts) {
          const postData = post.data;
          
          // Skip stickied posts
          if (postData.stickied) continue;

          const titleLower = postData.title.toLowerCase();
          const bodyLower = (postData.selftext || '').toLowerCase();
          
          const isHiring = titleLower.includes('hiring') || 
                           titleLower.includes('looking for') || 
                           titleLower.includes('need') || 
                           bodyLower.includes('hiring') || 
                           bodyLower.includes('looking for developer') ||
                           titleLower.includes('contract') ||
                           bodyLower.includes('contract');
                           
          if (!isHiring) continue;

          const leadId = `reddit_${postData.id}`;
          const analysis = analyzeLead(postData.title, postData.selftext || '');

          leads.push({
            id: leadId,
            title: postData.title,
            description: postData.selftext || '',
            url: `https://www.reddit.com${postData.permalink}`,
            author: postData.author,
            created_time: postData.created_utc,
            estimated_budget: analysis.estimatedBudget,
            technology: analysis.technology,
            platform: analysis.platform,
            location: postData.link_flair_text || 'Remote',
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
  } catch (err) {
    logger.error(`Playwright Reddit browser initialization failed: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  logger.scraper('reddit', `Completed Reddit scraping. Extracted ${leads.length} mobile/hiring leads.`);
  return leads;
}

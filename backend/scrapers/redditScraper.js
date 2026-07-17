import { chromium } from 'playwright';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';
import { SUBREDDITS, KEYWORDS } from './redditConstants.js';

export async function scrapeReddit() {
  logger.scraper('reddit', `Starting Reddit scrape of ${SUBREDDITS.length} subreddits via Playwright HTML crawler...`);
  const leads = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US'
    });
    const page = await context.newPage();

    for (const subreddit of SUBREDDITS) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/new/`;
        logger.scraper('reddit', `Navigating to r/${subreddit}...`);
        
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        
        const posts = await page.evaluate(() => {
          const items = [];
          const postElements = document.querySelectorAll('shreddit-post');
          
          postElements.forEach((post) => {
            const id = post.getAttribute('id') || '';
            const title = post.getAttribute('post-title') || '';
            const permalink = post.getAttribute('permalink') || '';
            const author = post.getAttribute('author') || '';
            const created = post.getAttribute('created-timestamp') || '';
            const body = post.innerText || '';
            
            items.push({ id, title, permalink, author, created, body });
          });
          return items;
        });

        logger.scraper('reddit', `Found ${posts.length} posts in r/${subreddit}`);

        for (const post of posts) {
          const titleLower = post.title.toLowerCase();
          const bodyLower = post.body.toLowerCase();
          
          // Skip posts made by other freelancers (for hire, offer, services, portfolio, hire me)
          const isForHire = titleLower.includes('[for hire]') || 
                            titleLower.includes('for hire') || 
                            titleLower.includes('[offer]') || 
                            titleLower.includes('[portfolio]') || 
                            titleLower.includes('[services]') ||
                            titleLower.startsWith('for hire') ||
                            titleLower.includes('hire me');
          if (isForHire) continue;
          
          // Match against the comprehensive keywords list
          const matchesKeyword = KEYWORDS.some(kw => titleLower.includes(kw) || bodyLower.includes(kw));
          if (!matchesKeyword) continue;

          // Clean ID (t3_1uyu7u1 -> 1uyu7u1)
          const cleanId = post.id.replace(/^t3_/, '');

          const leadId = `reddit_${cleanId}`;
          const analysis = analyzeLead(post.title, post.body);
          
          // Parse created timestamp
          let created_time = Math.floor(Date.now() / 1000);
          if (post.created) {
            created_time = Math.floor(Date.parse(post.created) / 1000) || created_time;
          }

          leads.push({
            id: leadId,
            title: post.title,
            description: post.body,
            url: `https://www.reddit.com${post.permalink}`,
            author: post.author || 'anonymous',
            created_time: created_time,
            estimated_budget: analysis.estimatedBudget,
            technology: analysis.technology,
            platform: analysis.platform,
            location: 'Remote',
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

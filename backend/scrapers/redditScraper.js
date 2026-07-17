import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';
import { SUBREDDITS, KEYWORDS } from './redditConstants.js';

const REDDIT_MIRRORS = [
  'https://safereddit.com',
  'https://redlib.ducks.party',
  'https://redlib.tux.pizza',
  'https://redlib.kittycat.homes',
  'https://redlib.perennialte.ch'
];

export async function scrapeReddit() {
  logger.scraper('reddit', `Starting Reddit scrape of ${SUBREDDITS.length} subreddits via mirror rotation...`);
  const leads = [];
  
  // Helper to scrape a single subreddit with mirror fallback rotation
  const scrapeSubreddit = async (subreddit) => {
    let postsData = [];
    
    for (const mirror of REDDIT_MIRRORS) {
      try {
        const url = `${mirror}/r/${subreddit}/new`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        const posts = $('.post');
        
        if (posts.length > 0) {
          logger.scraper('reddit', `Successfully crawled r/${subreddit} using ${mirror}. Found ${posts.length} posts.`);
          
          posts.each((_, element) => {
            const $post = $(element);
            const id = $post.attr('id') || '';
            const $titleLink = $post.find('.post_title a');
            if ($titleLink.length === 0) return;
            
            const title = $titleLink.text().trim();
            const permalink = $titleLink.attr('href') || '';
            const author = $post.find('.post_author').text().trim().replace(/^u\//, '');
            const body = $post.find('.post_body').text().trim();
            const createdTitle = $post.find('.created').attr('title') || '';
            
            let created_time = Math.floor(Date.now() / 1000);
            if (createdTitle) {
              created_time = Math.floor(Date.parse(createdTitle) / 1000) || created_time;
            }

            postsData.push({ id, title, permalink, author, body, created_time, subreddit });
          });
          
          break; // Successfully got posts, exit mirror fallback loop
        }
      } catch (err) {
        // Silent catch, try next mirror
      }
    }
    
    if (postsData.length === 0) {
      logger.scraper('reddit', `All mirrors returned 0 posts or failed for r/${subreddit}`);
    }
    
    return postsData;
  };

  // Run in chunks of 5 parallel requests to avoid overwhelming the mirrors or local stack
  const chunkSize = 5;
  for (let i = 0; i < SUBREDDITS.length; i += chunkSize) {
    const chunk = SUBREDDITS.slice(i, i + chunkSize);
    logger.scraper('reddit', `Scraping batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(SUBREDDITS.length / chunkSize)}...`);
    
    const results = await Promise.all(chunk.map(sub => scrapeSubreddit(sub)));
    const allBatchPosts = results.flat();
    
    for (const post of allBatchPosts) {
      const titleLower = post.title.toLowerCase();
      const bodyLower = post.body.toLowerCase();
      
      // Match against the comprehensive keywords list
      const matchesKeyword = KEYWORDS.some(kw => titleLower.includes(kw) || bodyLower.includes(kw));
      if (!matchesKeyword) continue;

      const leadId = `reddit_${post.id}`;
      const analysis = analyzeLead(post.title, post.body);

      leads.push({
        id: leadId,
        title: post.title,
        description: post.body,
        url: `https://www.reddit.com${post.permalink}`,
        author: post.author || 'anonymous',
        created_time: post.created_time,
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
    
    // Quick cooling delay between batches to respect mirrors
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  logger.scraper('reddit', `Completed Reddit scraping. Extracted ${leads.length} mobile/hiring leads.`);
  return leads;
}

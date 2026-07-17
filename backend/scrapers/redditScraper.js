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
  logger.scraper('reddit', `Starting Reddit scrape of ${SUBREDDITS.length} subreddits via load-balanced mirror rotation...`);
  const leads = [];
  
  // Track starting mirror index to distribute load evenly
  let mirrorIndex = 0;

  for (let i = 0; i < SUBREDDITS.length; i++) {
    const subreddit = SUBREDDITS[i];
    let postsData = [];
    
    // Rotate the starting mirror for each request
    const currentMirrorSequence = [
      ...REDDIT_MIRRORS.slice(mirrorIndex),
      ...REDDIT_MIRRORS.slice(0, mirrorIndex)
    ];
    mirrorIndex = (mirrorIndex + 1) % REDDIT_MIRRORS.length;

    let mirrorsTried = 0;
    for (const mirror of currentMirrorSequence) {
      if (mirrorsTried >= 2) break;
      mirrorsTried++;
      try {
        const url = `${mirror}/r/${subreddit}/new`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          },
          timeout: 3000
        });

        const $ = cheerio.load(response.data);
        const posts = $('.post');
        
        if (posts.length > 0) {
          logger.scraper('reddit', `[${i + 1}/${SUBREDDITS.length}] Crawled r/${subreddit} successfully using ${mirror}. Found ${posts.length} posts.`);
          
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
          
          break; // Successfully got posts, exit mirror sequence loop
        }
      } catch (err) {
        // Silent catch, try next mirror in sequence
      }
    }

    if (postsData.length === 0) {
      logger.scraper('reddit', `[${i + 1}/${SUBREDDITS.length}] All mirrors failed or returned 0 posts for r/${subreddit}`);
    } else {
      // Process extracted posts matching against keywords list
      for (const post of postsData) {
        const titleLower = post.title.toLowerCase();
        const bodyLower = post.body.toLowerCase();
        
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
    }

    // A small human-like delay (800ms - 1500ms) between sequential subreddits to prevent mirror rate limits
    const delay = 800 + Math.floor(Math.random() * 700);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  logger.scraper('reddit', `Completed Reddit scraping. Extracted ${leads.length} mobile/hiring leads.`);
  return leads;
}

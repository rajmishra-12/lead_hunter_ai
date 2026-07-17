import axios from 'axios';
import * as cheerio from 'cheerio';
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
  logger.scraper('reddit', 'Starting Reddit scrape via Redlib mirror...');
  const leads = [];

  for (const subreddit of SUBREDDITS) {
    try {
      const url = `https://safereddit.com/r/${subreddit}/new`;
      logger.scraper('reddit', `Fetching r/${subreddit} from Redlib mirror...`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const posts = $('.post');
      logger.scraper('reddit', `Found ${posts.length} posts in r/${subreddit}`);

      posts.each((_, element) => {
        const $post = $(element);
        const id = $post.attr('id') || '';
        
        // Find title and permalink
        const $titleLink = $post.find('.post_title a');
        if ($titleLink.length === 0) return;
        
        const title = $titleLink.text().trim();
        const permalink = $titleLink.attr('href') || '';
        
        // Find author
        const author = $post.find('.post_author').text().trim().replace(/^u\//, '');
        
        // Find body text
        const body = $post.find('.post_body').text().trim();
        
        // Find created time
        const createdTitle = $post.find('.created').attr('title') || '';
        let created_time = Math.floor(Date.now() / 1000);
        if (createdTitle) {
          created_time = Math.floor(Date.parse(createdTitle) / 1000) || created_time;
        }

        const titleLower = title.toLowerCase();
        const bodyLower = body.toLowerCase();
        
        const isHiring = titleLower.includes('hiring') || 
                         titleLower.includes('looking for') || 
                         titleLower.includes('need') || 
                         bodyLower.includes('hiring') || 
                         bodyLower.includes('looking for developer') ||
                         titleLower.includes('contract') ||
                         bodyLower.includes('contract');
                         
        if (!isHiring) return;

        const leadId = `reddit_${id}`;
        const analysis = analyzeLead(title, body);

        leads.push({
          id: leadId,
          title: title,
          description: body,
          url: `https://www.reddit.com${permalink}`,
          author: author || 'anonymous',
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
      });
    } catch (error) {
      logger.error(`Error scraping r/${subreddit}: ${error.message}`);
    }
  }

  logger.scraper('reddit', `Completed Reddit scraping. Extracted ${leads.length} mobile/hiring leads.`);
  return leads;
}

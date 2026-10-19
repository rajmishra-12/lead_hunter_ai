import { chromium } from 'playwright';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';
import { SUBREDDITS, isRedditLead } from './redditConstants.js';
import { isFreshWithinDays } from '../services/qualifier.js';

/**
 * Extract posts from Reddit page DOM using Playwright evaluate.
 * Supports both shreddit-post custom elements and standard semantic article/anchor structures.
 */
function extractPostsFromDom() {
  const seen = new Set();
  const items = [];

  // 1. Shreddit post web components
  const postElements = document.querySelectorAll('shreddit-post');
  postElements.forEach((post) => {
    const rawId = post.getAttribute('id') || '';
    const cleanId = rawId.replace(/^t3_/, '');
    const title = post.getAttribute('post-title') || '';
    const permalink = post.getAttribute('permalink') || '';
    const author = post.getAttribute('author') || 'anonymous';
    const created = post.getAttribute('created-timestamp') || '';
    const body = post.innerText || '';

    if (title && permalink && !seen.has(permalink)) {
      seen.add(permalink);
      if (cleanId) seen.add(cleanId);
      items.push({ id: cleanId, title, permalink, author, created, body });
    }
  });

  // 2. Semantic article / comment link anchors (fallback / supplement)
  const links = Array.from(document.querySelectorAll('a[href*="/comments/"]'));
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    const title = a.innerText.trim();
    if (!href.includes('/comments/') || title.length < 5) continue;

    const idMatch = href.match(/\/comments\/([a-z0-9]+)/i);
    const cleanId = idMatch ? idMatch[1] : '';
    const permalink = href.startsWith('http') ? href.replace(/^https?:\/\/[^/]+/, '') : href;

    if (seen.has(permalink) || (cleanId && seen.has(cleanId))) continue;
    seen.add(permalink);
    if (cleanId) seen.add(cleanId);

    const parent = a.closest('article') || a.closest('div[data-testid]') || a.parentElement?.parentElement;
    const authorEl = parent?.querySelector('a[href*="/user/"]');
    const author = authorEl ? authorEl.innerText.replace(/^u\//, '').trim() : 'anonymous';
    const body = parent ? parent.innerText.replace(/\n+/g, ' ').trim() : '';
    const timeEl = parent?.querySelector('time');
    const created = timeEl ? (timeEl.getAttribute('datetime') || timeEl.innerText || '') : '';

    items.push({ id: cleanId, title, permalink, author, created, body });
  }

  return items;
}

/**
 * Robust timestamp parser supporting ISO, RFC, and relative Reddit formats (e.g. '2 days ago', '18 hr. ago').
 */
export function parseRedditTimestamp(raw) {
  if (!raw) return Math.floor(Date.now() / 1000);
  const str = String(raw).trim();
  
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return Math.floor(parsed / 1000);
  }

  const now = Math.floor(Date.now() / 1000);
  const s = str.toLowerCase();

  const daysMatch = s.match(/(\d+)\s*(?:d|day|days)\b/);
  if (daysMatch) {
    return now - (parseInt(daysMatch[1], 10) * 86400);
  }

  const hoursMatch = s.match(/(\d+)\s*(?:h|hr|hour|hours)\b/);
  if (hoursMatch) {
    return now - (parseInt(hoursMatch[1], 10) * 3600);
  }

  const minsMatch = s.match(/(\d+)\s*(?:m|min|minute|minutes)\b/);
  if (minsMatch) {
    return now - (parseInt(minsMatch[1], 10) * 60);
  }

  if (s.includes('yesterday')) {
    return now - 86400;
  }

  if (s.includes('week')) {
    const weeksMatch = s.match(/(\d+)\s*week/);
    const count = weeksMatch ? parseInt(weeksMatch[1], 10) : 1;
    return now - (count * 7 * 86400);
  }

  return now;
}

/**
 * Fallback scraper using Reddit RSS feeds if browser encounters issues.
 */
async function scrapeSubredditViaRss(subreddit) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/new/.rss`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'macos:leadhunter.ai:v1.0.0 (by /u/leadhunter_bot)'
      },
      timeout: 8000
    });

    const $ = cheerio.load(res.data, { xmlMode: true });
    const items = [];

    $('entry').each((_, el) => {
      const rawId = $(el).find('id').text() || '';
      const cleanId = rawId.replace(/^t3_/, '');
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').attr('href') || '';
      const permalink = link.replace(/^https?:\/\/[^/]+/, '');
      const contentHtml = $(el).find('content').text() || '';
      const body = cheerio.load(contentHtml).text().trim();
      const author = ($(el).find('author name').text() || 'anonymous').replace(/^\/u\//, '');
      const created = $(el).find('updated').text() || '';

      if (title && permalink) {
        items.push({ id: cleanId, title, permalink, author, created, body });
      }
    });

    return items;
  } catch (err) {
    logger.error(`RSS scrape failed for r/${subreddit}: ${err.message}`);
    return [];
  }
}

export async function scrapeReddit(onProgress = null) {
  logger.scraper('reddit', `Starting Reddit scrape across ${SUBREDDITS.length} active developer communities...`);
  const leads = [];
  const seenLeadIds = new Set();
  let browser;

  const BATCH_SIZE = 6; // Concurrent pages per batch for reliable hydration across 200+ groups

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      viewport: { width: 1280, height: 900 }
    });

    for (let i = 0; i < SUBREDDITS.length; i += BATCH_SIZE) {
      const batch = SUBREDDITS.slice(i, i + BATCH_SIZE);
      logger.scraper('reddit', `Scanning [${i + 1}-${Math.min(i + BATCH_SIZE, SUBREDDITS.length)}/${SUBREDDITS.length}]: ${batch.map(s => 'r/' + s).join(', ')}`);
      
      const batchPromises = batch.map(async (subreddit) => {
        let page;
        try {
          page = await context.newPage();
          const url = `https://www.reddit.com/r/${subreddit}/new/`;
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
          await page.waitForFunction(() => document.querySelectorAll('shreddit-post, a[href*="/comments/"], article').length >= 2, { timeout: 3500 }).catch(() => {});
          await page.evaluate(() => window.scrollBy(0, 2500));
          await page.waitForTimeout(600);

          const posts = await page.evaluate(extractPostsFromDom);
          await page.close().catch(() => {});
          return { subreddit, posts };
        } catch (err) {
          if (page) await page.close().catch(() => {});
          return { subreddit, posts: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const { subreddit, posts } of batchResults) {
        let subredditMatches = 0;
        for (const post of posts) {
          if (!isRedditLead(post.title, post.body)) continue;

          const leadId = `reddit_${post.id || Buffer.from(post.permalink).toString('base64').substring(0, 16)}`;
          if (seenLeadIds.has(leadId)) continue;
          seenLeadIds.add(leadId);

          const analysis = analyzeLead(post.title, post.body);

          const created_time = parseRedditTimestamp(post.created);

          // Extend freshness window to 14 days so posts from today, 2-3 days ago, and earlier are captured
          if (!isFreshWithinDays(created_time, 14)) {
            continue;
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
          subredditMatches++;
        }
        if (subredditMatches > 0) {
          logger.scraper('reddit', `r/${subreddit}: extracted ${subredditMatches} candidate hiring posts.`);
        }
      }

      if (typeof onProgress === 'function') {
        const scannedCount = Math.min(i + BATCH_SIZE, SUBREDDITS.length);
        const progress = Math.min(45, 10 + Math.floor((scannedCount / SUBREDDITS.length) * 35));
        onProgress({ phase: 'reddit', message: `Scanning Reddit: ${scannedCount} of ${SUBREDDITS.length} communities (${leads.length} candidates found)...`, progress });
      }
    }
  } catch (err) {
    logger.error(`Playwright Reddit error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  logger.scraper('reddit', `Completed Reddit scraping across all ${SUBREDDITS.length} groups. Found ${leads.length} potential client opportunities.`);
  return leads;
}

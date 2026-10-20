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

  function parseTime(datetimeStr, relativeText) {
    if (datetimeStr) {
      const parsed = Date.parse(datetimeStr);
      if (!isNaN(parsed)) return Math.floor(parsed / 1000);
    }
    if (!relativeText) return null;
    const now = Math.floor(Date.now() / 1000);
    const text = relativeText.toLowerCase().trim();
    const dayMatch = text.match(/(\d+)\s*(?:d|day|days)/);
    if (dayMatch) return now - (parseInt(dayMatch[1], 10) * 86400);
    const hourMatch = text.match(/(\d+)\s*(?:h|hr|hour|hours)/);
    if (hourMatch) return now - (parseInt(hourMatch[1], 10) * 3600);
    const minMatch = text.match(/(\d+)\s*(?:m|min|minute|minutes)/);
    if (minMatch) return now - (parseInt(minMatch[1], 10) * 60);
    if (text.includes('yesterday')) return now - 86400;
    return null;
  }

  // 1. Shreddit post web components
  const postElements = document.querySelectorAll('shreddit-post');
  postElements.forEach((post) => {
    const rawId = post.getAttribute('id') || '';
    const cleanId = rawId.replace(/^t3_/, '');
    const title = post.getAttribute('post-title') || '';
    const permalink = post.getAttribute('permalink') || '';
    const author = post.getAttribute('author') || 'anonymous';
    const rawCreated = post.getAttribute('created-timestamp') || post.querySelector('time')?.getAttribute('datetime') || '';
    const timeText = post.querySelector('time')?.innerText || '';
    const createdTime = parseTime(rawCreated, timeText);
    const body = post.innerText || '';

    if (title && permalink && !seen.has(permalink)) {
      seen.add(permalink);
      if (cleanId) seen.add(cleanId);
      items.push({ id: cleanId, title, permalink, author, created: rawCreated, createdTime, body });
    }
  });

  // 2. Semantic article / comment link anchors (fallback / supplement)
  const links = Array.from(document.querySelectorAll('a[href*="/comments/"]'));
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    let title = a.innerText.trim();
    
    // Ignore comment buttons, vote counters, share links, or short UI labels
    if (
      !href.includes('/comments/') || 
      title.length < 15 || 
      /^\d+\s*comments?$/i.test(title) ||
      /\bcomments?\b/i.test(title) ||
      /^share$/i.test(title) ||
      /^\d+$/i.test(title) ||
      /^vote$/i.test(title)
    ) {
      continue;
    }

    const heading = a.closest('h1, h2, h3, [slot="title"]') || a.querySelector('h1, h2, h3');
    if (heading && heading.innerText.trim().length > title.length) {
      title = heading.innerText.trim();
    }

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
    const rawCreated = timeEl ? (timeEl.getAttribute('datetime') || '') : '';
    const timeText = timeEl ? timeEl.innerText : '';
    const createdTime = parseTime(rawCreated, timeText);

    items.push({ id: cleanId, title, permalink, author, created: rawCreated, createdTime, body });
  }

  return items;
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

    // -------------------------------------------------------------------------
    // Phase 1A: Targeted High-Intent Keyword Searches Across All Reddit (Last 7 Days)
    // Directly extracts buyer posts across all public subreddits without rate limits
    // -------------------------------------------------------------------------
    const targetedSearches = [
      { name: 'Dev & Engineer Hiring', query: 'title:"[Hiring]" (developer OR engineer OR programmer OR coder OR fullstack OR frontend OR backend)' },
      { name: 'Stack Specific Hiring', query: 'title:"[Hiring]" (flutter OR "react native" OR reactjs OR nextjs OR nodejs OR typescript OR web OR app)' },
      { name: 'Direct Buyer Phrases', query: '"looking for a developer" OR "need a developer" OR "looking to hire a developer" OR "hire a web developer"' },
      { name: 'App & MVP Requirements', query: 'title:"[Hiring]" ("mobile app" OR "web app" OR "build an app" OR "build a website" OR mvp OR saas)' },
      { name: 'Backend, Python & AI', query: 'title:"[Hiring]" (python OR django OR fastapi OR automation OR scraping OR scraper OR bot OR api OR openai)' },
      { name: 'Freelance & Fixed Price', query: 'title:"[Hiring]" (freelance OR contractor OR "paid project" OR "fixed price" OR "hourly")' },
      { name: 'Hiring to Build', query: '"looking to hire" (developer OR programmer OR flutter OR react OR "web dev" OR "app dev")' },
      { name: 'Client Need Dev', query: '"need a programmer" OR "need a coder" OR "hire an app developer" OR "hire a mobile developer"' }
    ];

    logger.scraper('reddit', `Running ${targetedSearches.length} high-yield targeted searches across all of Reddit...`);
    if (typeof onProgress === 'function') {
      onProgress({ phase: 'reddit', message: 'Running targeted searches across all Reddit hiring feeds...', progress: 12 });
    }

    for (let sIdx = 0; sIdx < targetedSearches.length; sIdx++) {
      const search = targetedSearches[sIdx];
      let page;
      try {
        page = await context.newPage();
        const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(search.query)}&sort=new&t=week`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1000);
        await page.evaluate(() => window.scrollBy(0, 3000));
        await page.waitForTimeout(600);
        await page.evaluate(() => window.scrollBy(0, 4000));
        await page.waitForTimeout(600);

        const searchPosts = await page.evaluate(extractPostsFromDom);
        await page.close().catch(() => {});

        let searchCount = 0;
        for (const post of searchPosts) {
          if (!isRedditLead(post.title, post.body)) continue;

          const leadId = `reddit_${post.id || Buffer.from(post.permalink).toString('base64').substring(0, 16)}`;
          if (seenLeadIds.has(leadId)) continue;
          seenLeadIds.add(leadId);

          const analysis = analyzeLead(post.title, post.body);
          let created_time = post.createdTime || Math.floor(Date.now() / 1000);
          if (!post.createdTime && post.created) {
            created_time = Math.floor(Date.parse(post.created) / 1000) || created_time;
          }

          if (!isFreshWithinDays(created_time, 7)) continue;

          leads.push({
            id: leadId,
            title: post.title,
            description: post.body,
            url: post.permalink.startsWith('http') ? post.permalink : `https://www.reddit.com${post.permalink}`,
            author: post.author || 'anonymous',
            created_time,
            estimated_budget: analysis.estimatedBudget,
            technology: analysis.technology,
            platform: analysis.platform,
            location: 'Remote',
            company: 'Reddit Client',
            source: 'reddit/search',
            score: analysis.score,
            ai_summary: analysis.summary,
            ai_risks: analysis.risks,
            ai_estimated_hours: analysis.estimatedHours,
            ai_suggested_tech: analysis.suggestedTech,
            status: 'New'
          });
          searchCount++;
        }
        logger.scraper('reddit', `Search "${search.name}": found ${searchCount} candidate buyer leads.`);
      } catch (err) {
        if (page) await page.close().catch(() => {});
      }

      if (typeof onProgress === 'function') {
        const progress = 12 + Math.floor(((sIdx + 1) / targetedSearches.length) * 18);
        onProgress({ phase: 'reddit', message: `Targeted search (${sIdx + 1}/${targetedSearches.length}): ${leads.length} leads found...`, progress });
      }
    }

    logger.scraper('reddit', `Targeted searches yielded ${leads.length} initial client leads. Now scanning premier gig & startup communities...`);

    // Target the highest-converting hiring & startup communities for rapid, unblocked ingestion
    const targetCommunities = SUBREDDITS.slice(0, 48);

    for (let i = 0; i < targetCommunities.length; i += BATCH_SIZE) {
      const batch = targetCommunities.slice(i, i + BATCH_SIZE);
      logger.scraper('reddit', `Scanning [${i + 1}-${Math.min(i + BATCH_SIZE, targetCommunities.length)}/${targetCommunities.length}]: ${batch.map(s => 'r/' + s).join(', ')}`);
      
      const batchPromises = batch.map(async (subreddit) => {
        let page;
        try {
          page = await context.newPage();
          const url = `https://www.reddit.com/r/${subreddit}/new/`;
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
          await page.waitForFunction(() => document.querySelectorAll('shreddit-post, a[href*="/comments/"], article').length >= 2, { timeout: 3500 }).catch(() => {});
          
          // Progressive multi-stage deep scroll to load posts from the last 2-3 days
          await page.evaluate(() => window.scrollBy(0, 2500));
          await page.waitForTimeout(400);
          await page.evaluate(() => window.scrollBy(0, 3500));
          await page.waitForTimeout(500);

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

          let created_time = Math.floor(Date.now() / 1000);
          if (post.createdTime) {
            created_time = post.createdTime;
          } else if (post.created) {
            created_time = Math.floor(Date.parse(post.created) / 1000) || created_time;
          }

          if (!isFreshWithinDays(created_time, 7)) {
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
        const scannedCount = Math.min(i + BATCH_SIZE, targetCommunities.length);
        const progress = Math.min(48, 30 + Math.floor((scannedCount / targetCommunities.length) * 18));
        onProgress({ phase: 'reddit', message: `Scanning Reddit: ${scannedCount} of ${targetCommunities.length} communities (${leads.length} candidates found)...`, progress });
      }
    }
  } catch (err) {
    logger.error(`Playwright Reddit error: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  logger.scraper('reddit', `Completed Reddit scraping across targeted feeds & communities. Found ${leads.length} potential client opportunities.`);
  return leads;
}

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { analyzeLead } from '../services/analyzer.js';

export async function scrapeHackerNews() {
  logger.scraper('hn', 'Starting Hacker News scrape...');
  const leads = [];

  try {
    // 1. Get the latest "Who is hiring?" story
    const searchUrl = 'https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring';
    const searchResponse = await axios.get(searchUrl);
    
    if (!searchResponse.data || !searchResponse.data.hits || searchResponse.data.hits.length === 0) {
      logger.scraper('hn', 'No "Who is hiring" story found.');
      return leads;
    }

    // Filter to get the actual monthly hiring post (exclude "Who wants to be hired" or "Ask HN")
    const hiringStory = searchResponse.data.hits.find(hit => 
      hit.title && hit.title.toLowerCase().startsWith('ask hn: who is hiring')
    );

    if (!hiringStory) {
      logger.scraper('hn', 'Could not locate the main hiring story.');
      return leads;
    }

    const storyId = hiringStory.objectID;
    logger.scraper('hn', `Fetching comments for HN Story ID: ${storyId} (${hiringStory.title})`);

    // 2. Fetch the story detail (which contains comment tree)
    const detailUrl = `https://hn.algolia.com/api/v1/items/${storyId}`;
    const detailResponse = await axios.get(detailUrl);

    if (!detailResponse.data || !detailResponse.data.children) {
      logger.scraper('hn', 'No comments found in hiring story.');
      return leads;
    }

    const comments = detailResponse.data.children;
    logger.scraper('hn', `Processing ${comments.length} HN top-level comments...`);

    // 3. Process top-level comments
    for (const comment of comments) {
      if (!comment.text) continue;

      const commentText = comment.text;
      const textLower = commentText.toLowerCase();

      // Filter: We only want mobile development opportunities (Flutter, React Native, iOS, Android, app developer)
      const isMobile = textLower.includes('flutter') || 
                       textLower.includes('react native') || 
                       textLower.includes('reactnative') || 
                       textLower.includes('ios') || 
                       textLower.includes('android') || 
                       textLower.includes('mobile');

      if (!isMobile) continue;

      // Extract details from comment header/text
      // First line of HN comment usually contains Company | Title | Location | Remote/Onsite
      const plainText = commentText.replace(/<[^>]*>/g, ' '); // Strip HTML
      const firstLine = plainText.split('\n')[0] || 'Hacker News Client';

      const analysis = analyzeLead(firstLine, plainText);
      const leadId = `hn_${comment.id}`;

      leads.push({
        id: leadId,
        title: firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine,
        description: plainText,
        url: `https://news.ycombinator.com/item?id=${comment.id}`,
        author: comment.author || 'HN User',
        created_time: comment.created_at_i || Math.floor(Date.now() / 1000),
        estimated_budget: analysis.estimatedBudget || 3000, // HN gigs are usually decent, default to 3k if 0
        technology: analysis.technology,
        platform: analysis.platform,
        location: textLower.includes('remote') ? 'Remote' : 'Onsite / Hybrid',
        company: firstLine.split('|')[0]?.trim() || 'HN Startup',
        source: 'Hacker News',
        score: analysis.score,
        ai_summary: analysis.summary,
        ai_risks: analysis.risks,
        ai_estimated_hours: analysis.estimatedHours,
        ai_suggested_tech: analysis.suggestedTech,
        status: 'New'
      });
    }

  } catch (error) {
    logger.error(`Error scraping Hacker News: ${error.message}`);
  }

  logger.scraper('hn', `Completed Hacker News scraping. Extracted ${leads.length} mobile leads.`);
  return leads;
}

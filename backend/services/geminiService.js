import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * Call Google Gemini Developer API with structured JSON output schema to qualify a lead.
 * Analyzes developer/buyer intent, technology requirements, budget, scope, and urgency.
 */
export async function analyzeWithGemini(title, description = '', metadata = {}) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in the backend environment (.env).');
  }

  const {
    source = 'reddit',
    author = 'unknown',
    url = '',
    created_time = null
  } = metadata;

  // Calculate age string for context
  let ageString = 'Unknown';
  if (created_time) {
    const ageSeconds = Math.floor(Date.now() / 1000) - (created_time > 1e11 ? Math.floor(created_time / 1000) : Number(created_time));
    const hours = Math.round(ageSeconds / 3600);
    const days = Math.round(hours / 24);
    ageString = days > 0 ? `${days} day(s) ago (${hours} hours)` : `${hours} hour(s) ago`;
  }

  const promptText = `
You are an expert Lead Qualification Specialist for an experienced freelance software developer.
Your sole mission is to find genuine buyers, founders, agencies, or businesses on Reddit hiring freelance developers for paid software development projects (target budget: $1,000+ USD, posted within the last 7 days).

Analyze this Reddit posting thoroughly:
- Title: "${title}"
- Body: "${description}"
- Subreddit/Source: "${source}"
- Author: "${author}"
- URL: "${url}"
- Posted: ${ageString}

================================================================================
CRITICAL EXCLUSION RULES (HOW TO FILTER OUT NOISE ON REDDIT):
================================================================================

1. FILTER OUT DEVELOPERS MARKETING THEMSELVES OR SEEKING JOBS (SELLERS):
   - On Reddit, many developers post their portfolios looking for work.
   - Look for tags, phrases, or signals like:
     * "[For Hire]", "[For-Hire]", "For Hire", "Hire Me", "Available for freelance/hire/work"
     * "Looking for work", "Seeking remote developer job", "Offering development services"
     * Authors listing their own skills, tech stack, years of experience, or linking to their GitHub, résumé/CV, or personal portfolio site.
   - THESE AUTHORS ARE SELLERS MARKETING SERVICES, NOT CLIENTS BUYING.
   - YOU MUST REJECT THEM: Set is_hiring=false, author_intent='seller', is_development_related=false, exclusion_reason='Author is a developer marketing their own services or searching for employment.'

2. FILTER OUT UNRELATED NON-DEVELOPMENT JOBS:
   - A post is NOT a freelance development project just because it says "[Hiring]".
   - Filter out roles like: Customer service, healthcare support, sales representatives, cold callers, appointment setters, telemarketers, technical recruiters, data entry, non-technical virtual assistants, video editors, content writers.
   - YOU MUST REJECT THEM: Set is_development_related=false, author_intent='unrelated', exclusion_reason='Non-software development employment role.'

3. FILTER OUT DISCUSSIONS, QUESTIONS, SHOWCASES & COMMUNITY NOISE:
   - Filter out:
     * Programming questions ("How are you handling X in Flutter/React?")
     * Educational tutorials, articles, or career advice ("What I learned after...")
     * Open-source project showcases without a paid hiring requirement ("I built a free tool")
     * Startup idea discussions or feedback threads without asking to hire a developer
     * Weekly community megathreads ("Thankful Thursday", "Feedback Friday", "Weekly Discussion", "Rules Reminder", "[Meta]")
   - YOU MUST REJECT THEM: Set is_hiring=false, author_intent='discussion', is_development_related=false, exclusion_reason='Community discussion, showcase, or resource thread without paid hiring requirement.'

4. FILTER OUT UNPAID, EQUITY-ONLY & SPECULATIVE GIGS:
   - Filter out: "Looking for a co-founder (equity only)", "unpaid internship", "work for exposure", "revenue/profit share only when we launch", "0 budget".
   - YOU MUST REJECT THEM: Set payment_status='unpaid_or_equity', budget_status='unpaid', exclusion_reason='Unpaid or equity-only engagement without guaranteed compensation.'

5. FILTER OUT TRULY STALE (>14 DAYS) OR UNVERIFIABLE POSTS:
   - Posts published today, 1-3 days ago, or within the last 14 days ARE FULLY VALID and active for pitching. DO NOT reject posts because they were posted 2-3 days ago.
   - Only reject if published more than 14 days ago, or if the post body is "[deleted]", "[removed]", or lacks enough detail to contact.
   - For genuinely stale (>14d) or removed posts: Set freshness_valid=false, exclusion_reason='Stale or unverifiable post.'

================================================================================
QUALIFICATION RULES (WHAT COUNTS AS A GENUINE PAID LEAD):
================================================================================

1. QUALIFY REAL BUYERS & CLIENTS:
   - Category A: Direct freelance projects (founder/client needs a mobile app built, React/Next.js site, MVP, SaaS, backend, or mobile app fix).
   - Category B: Agency subcontracting (software agency or studio hiring a contractor for overflow or white-label client work).
   - Category C: Paid technical tasks (Stripe/payment gateway integration, API development, bug fixing, performance optimization, auth setup).
   - Category D: Broader development projects across Flutter, React Native, React, Next.js, Node.js, TypeScript, Python, APIs, scraping, automations, or AI integrations.
   * Note: The client does not need to name a specific tech stack (e.g. "Need someone to build a booking app" is completely valid).
   * For qualified leads: Set is_hiring=true, author_intent='buyer', is_development_related=true.

2. STRICT BUDGET HANDLING:
   - Target is >= $1,000 USD.
   - If an explicit budget is stated, extract budget_min_usd and budget_max_usd. Set budget_status='confirmed' if >= 1000, or 'below_1000' if < 1000.
   - If NO budget is mentioned in the post: DO NOT INVENT A BUDGET. Set budget_min_usd=0, budget_max_usd=0, and budget_status='unknown'. Do NOT reject purely because the budget is unstated if the hiring intent is genuine.

3. ACTIONABLE OUTREACH:
   - Provide an objective 0-100 lead_score reflecting buyer intent, project scope, and budget potential.
   - Provide a concise qualification_reason and a specific recommended_action for contacting the Reddit poster (e.g. key technical pitch, relevant portfolio proof to share).
`;

  const requestUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          is_hiring: { type: 'BOOLEAN', description: 'True ONLY if the author is a buyer looking to hire someone, NOT a developer selling services.' },
          author_intent: { type: 'STRING', enum: ['buyer', 'seller', 'seeker', 'discussion', 'unrelated'] },
          is_development_related: { type: 'BOOLEAN', description: 'True if there is an actual software/app/web development requirement.' },
          engagement_type: { 
            type: 'STRING', 
            enum: ['direct_freelance', 'agency_subcontract', 'paid_technical_task', 'full_time_job', 'equity_only', 'unpaid', 'discussion', 'other'] 
          },
          payment_status: { 
            type: 'STRING', 
            enum: ['paid_or_budgeted', 'budget_unknown', 'unpaid_or_equity', 'ambiguous'] 
          },
          budget_min_usd: { type: 'NUMBER', description: 'Minimum stated budget in USD, or 0 if unknown.' },
          budget_max_usd: { type: 'NUMBER', description: 'Maximum stated budget in USD, or 0 if unknown.' },
          budget_status: { 
            type: 'STRING', 
            enum: ['confirmed', 'unknown', 'below_1000', 'unpaid'] 
          },
          project_summary: { type: 'STRING', description: '1-2 sentence description of the project and requirement.' },
          required_skills: { 
            type: 'ARRAY', 
            items: { type: 'STRING' },
            description: 'Technologies, platforms, or skills required.' 
          },
          scope_clarity: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          urgency: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          freshness_valid: { type: 'BOOLEAN', description: 'True if posted within 7 days and still actionable.' },
          exclusion_reason: { type: 'STRING', description: 'If not a qualified freelance lead, reason why it was excluded.' },
          lead_score: { type: 'INTEGER', description: 'Overall lead quality score 0-100.' },
          qualification_reason: { type: 'STRING', description: 'Why this post qualifies or does not qualify.' },
          recommended_action: { type: 'STRING', description: 'Concrete next step to win this opportunity.' }
        },
        required: [
          'is_hiring', 'author_intent', 'is_development_related', 'engagement_type',
          'payment_status', 'budget_min_usd', 'budget_max_usd', 'budget_status',
          'project_summary', 'required_skills', 'scope_clarity', 'urgency',
          'freshness_valid', 'lead_score', 'qualification_reason', 'recommended_action'
        ]
      }
    }
  };

  // Retry up to 3 times with exponential backoff on 429 / 503
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.post(requestUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 18000
      });

      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates[0] &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts[0]
      ) {
        const textResponse = response.data.candidates[0].content.parts[0].text;
        const parsed = JSON.parse(textResponse);
        logger.info(`Gemini qualification success for: "${title.substring(0, 40)}..." (Score: ${parsed.lead_score})`);
        return parsed;
      }
      throw new Error('Malformed response structure from Gemini API');
    } catch (err) {
      lastError = err;
      const status = err.response ? err.response.status : null;
      if (status === 429 || status === 503) {
        logger.warn(`Gemini API returned status ${status} on attempt ${attempt}. Retrying in ${attempt * 1.5}s...`);
        await new Promise(r => setTimeout(r, attempt * 1500));
        continue;
      }
      // Non-retryable error (e.g. 400 bad request)
      break;
    }
  }

  logger.error(`Gemini API call failed after retries: ${lastError.message}`);
  throw lastError;
}

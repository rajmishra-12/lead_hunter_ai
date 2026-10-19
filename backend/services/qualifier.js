/**
 * Deterministic Lead Qualification, Filtering, and Scoring Engine for LeadHunter AI.
 * Enforces hard exclusions (self-promotions, unrelated jobs, discussions, unpaid, stale >7d)
 * and combines deterministic rules with Gemini's semantic evaluation into a transparent 0-100 score.
 */

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/**
 * Checks whether the original publication timestamp is within the rolling 7-day window.
 */
export function isFreshWithinDays(createdTime, maxDays = 7) {
  if (!createdTime) return true; // if missing, cannot strictly disqualify solely on time
  const nowSec = Math.floor(Date.now() / 1000);
  const createdSec = createdTime > 1e11 ? Math.floor(createdTime / 1000) : Number(createdTime);
  const ageSeconds = nowSec - createdSec;
  return ageSeconds <= (maxDays * 86400) && ageSeconds >= -3600; // allow 1h clock drift
}

/**
 * Fast deterministic pre-filter to reject obvious non-leads prior to AI evaluation.
 * Saves Gemini quota and eliminates obvious noise.
 */
export function preFilterCandidate(post) {
  const title = (post.title || '').trim();
  const body = (post.description || post.body || '').trim();
  const titleLower = title.toLowerCase();
  const text = `${titleLower} ${body.toLowerCase()}`;

  // 1. Freshness Check (Rolling 7 days)
  if (post.created_time && !isFreshWithinDays(post.created_time, 7)) {
    return {
      pass: false,
      reason: 'Stale post published more than 7 days ago.'
    };
  }

  // 2. Reject Developers Looking for Work / Self-Promotions
  const freelancerSellingPatterns = [
    /^\[for hire\]/i,
    /^\[for-hire\]/i,
    /\bfor hire\b/i,
    /\bhire me\b/i,
    /\bavailable for freelance\b/i,
    /\bavailable for hire\b/i,
    /\bavailable for work\b/i,
    /\blooking for work\b/i,
    /\bseeking work\b/i,
    /\bseeking remote developer job/i,
    /\bseeking (junior|mid|senior|sde|developer|engineer) (role|job|internship|position)\b/i,
    /\bmy portfolio\b/i,
    /\bcheck out my portfolio\b/i,
    /\boffering (my |web |mobile |app )?(development |coding )?services\b/i,
    /\bi am a (flutter|react|full[- ]?stack|ios|android|web) developer looking for\b/i,
    /\bi'm a (flutter|react|full[- ]?stack|ios|android|web) developer looking for\b/i,
    /\bi am looking for my next opportunity\b/i
  ];

  for (const pattern of freelancerSellingPatterns) {
    if (pattern.test(titleLower)) {
      return {
        pass: false,
        reason: 'Author is a developer marketing their own services or searching for employment.'
      };
    }
  }

  // 3. Reject Unrelated Jobs (Non-development / non-technical)
  const unrelatedJobKeywords = [
    'customer service',
    'healthcare support',
    'patient care',
    'medical assistant',
    'sales representative',
    'sales rep',
    'cold caller',
    'telemarketer',
    'call center',
    'recruiter',
    'talent acquisition',
    'data entry',
    'virtual assistant (non-technical',
    'virtual assistant — remote, usa',
    'personal assistant',
    'content writer (non-tech)',
    'video editor',
    'on-camera presenter',
    'voice actor',
    'warehouse',
    'delivery driver',
    'retail associate'
  ];

  for (const kw of unrelatedJobKeywords) {
    if (titleLower.includes(kw)) {
      return {
        pass: false,
        reason: `Unrelated non-development job role detected: "${kw}".`
      };
    }
  }

  // 4. Reject Discussions, Community Megathreads, Free Resources & Noise
  const discussionNoisePatterns = [
    /\bthankful thursday\b/i,
    /\bweekly discussion\b/i,
    /\bcommunity megathread\b/i,
    /\bfree resources and tools\b/i,
    /\bfree tools\b/i,
    /\bwhat i learned\b/i,
    /\bhow are you handling\b/i,
    /\brules reminder\b/i,
    /\brules & guidelines\b/i,
    /\bannouncement\b/i,
    /^\[meta\]/i,
    /\bcheck-in & updates\b/i,
    /\bminimum karma requirements\b/i,
    /\bhow to protect yourself\b/i
  ];

  for (const pattern of discussionNoisePatterns) {
    if (pattern.test(titleLower)) {
      return {
        pass: false,
        reason: 'Community discussion, weekly megathread, rules, or informational resource post.'
      };
    }
  }

  // 5. Reject Equity-Only or Completely Unpaid Posts
  const unpaidPatterns = [
    /\bequity only\b/i,
    /\bequity-only\b/i,
    /\bunpaid internship\b/i,
    /\bunpaid role\b/i,
    /\bunpaid project\b/i,
    /\bfor exposure\b/i,
    /\bprofit share only\b/i,
    /\b0 budget\b/i,
    /\bno budget\b/i
  ];

  for (const pattern of unpaidPatterns) {
    if (pattern.test(titleLower) || pattern.test(text.substring(0, 400))) {
      return {
        pass: false,
        reason: 'Unpaid, equity-only, or speculative collaboration without guaranteed compensation.'
      };
    }
  }

  // 6. Reject Deleted, Removed, or Empty Posts
  if (
    body === '[deleted]' || 
    body === '[removed]' || 
    body === '[deleted by user]' ||
    (title.length < 8 && body.length < 15)
  ) {
    return {
      pass: false,
      reason: 'Deleted, removed, or empty posting without verifiable requirements.'
    };
  }

  return { pass: true, reason: null };
}

/**
 * Transparent 0–100 Scoring Model combining Gemini evaluation and deterministic validations.
 *
 * Scoring breakdown:
 * - 30 pts: Clear buyer intent (author is seeking/buying development services)
 * - 20 pts: Concrete development requirement (software/app/web/API/automation deliverable)
 * - 15 pts: Evidence of paid engagement / allocated budget
 * - 10 pts: Scope clarity (high=10, medium=7, low=3)
 * - 10 pts: Budget potential relative to $1,000 target ($1000+=10, unknown=5, <$1000=2)
 * - 10 pts: Urgency / actionable deadline (high=10, medium=6, low=2)
 * - 5 pts: Recent publication within 7 days (<=24h=5, <=3d=4, <=7d=3, >7d=0)
 */
export function calculateLeadScore(geminiData, postMetadata = {}) {
  // Hard Exclusion Checks: Immediately disqualify regardless of score
  const isHiring = geminiData.is_hiring === true;
  const isBuyer = geminiData.author_intent === 'buyer';
  const isDevRelated = geminiData.is_development_related === true;
  const isUnpaidOrEquity = geminiData.payment_status === 'unpaid_or_equity' || geminiData.budget_status === 'unpaid';
  const isFresh = geminiData.freshness_valid !== false && isFreshWithinDays(postMetadata.created_time, 7);

  if (!isHiring || !isBuyer || !isDevRelated || isUnpaidOrEquity || !isFresh || geminiData.exclusion_reason) {
    return {
      score: 0,
      isQualified: false,
      exclusionReason: geminiData.exclusion_reason || (
        !isHiring || !isBuyer ? 'Author is not looking to hire development services.' :
        !isDevRelated ? 'Not a software development requirement.' :
        isUnpaidOrEquity ? 'Unpaid or equity-only engagement.' :
        !isFresh ? 'Post is older than 7 days.' : 'Disqualified by qualification rules.'
      )
    };
  }

  let score = 0;

  // 1. Buyer Intent (30 pts)
  if (isBuyer && isHiring) {
    score += 30;
  }

  // 2. Concrete Development Requirement (20 pts)
  if (isDevRelated) {
    score += 20;
  }

  // 3. Paid Engagement Evidence (15 pts)
  if (geminiData.payment_status === 'paid_or_budgeted') {
    score += 15;
  } else if (geminiData.payment_status === 'budget_unknown') {
    score += 10;
  } else if (geminiData.payment_status === 'ambiguous') {
    score += 5;
  }

  // 4. Scope Clarity (10 pts)
  const scope = (geminiData.scope_clarity || '').toLowerCase();
  if (scope === 'high') score += 10;
  else if (scope === 'medium') score += 7;
  else score += 3;

  // 5. Budget Potential relative to $1,000 Target (10 pts)
  const bStatus = (geminiData.budget_status || '').toLowerCase();
  const maxBudget = Number(geminiData.budget_max_usd) || Number(geminiData.budget_min_usd) || 0;
  if (bStatus === 'confirmed' || maxBudget >= 1000) {
    score += 10;
  } else if (bStatus === 'unknown') {
    score += 5; // Do not penalize too heavily for undisclosed budget if otherwise strong
  } else if (bStatus === 'below_1000') {
    score += 2;
  }

  // 6. Urgency (10 pts)
  const urgency = (geminiData.urgency || '').toLowerCase();
  if (urgency === 'high') score += 10;
  else if (urgency === 'medium') score += 6;
  else score += 2;

  // 7. Freshness (5 pts)
  if (postMetadata.created_time) {
    const ageSeconds = Math.floor(Date.now() / 1000) - (postMetadata.created_time > 1e11 ? Math.floor(postMetadata.created_time / 1000) : Number(postMetadata.created_time));
    if (ageSeconds <= 86400) score += 5;
    else if (ageSeconds <= 3 * 86400) score += 4;
    else if (ageSeconds <= 7 * 86400) score += 3;
  } else {
    score += 3;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    isQualified: score >= 40,
    exclusionReason: null
  };
}

/**
 * Categorizes a qualified post into one of the 5 distinct workflow categories:
 * 1. 'high_priority': Confirmed $1,000+ budget or top-tier client with score >= 75
 * 2. 'budget_unknown': High-potential opportunity with unstated budget
 * 3. 'agency_contract': Software agency subcontracting / overflow work
 * 4. 'manual_review': Promising but ambiguous scope or compensation (score 40-74)
 * 5. 'rejected': Disqualified, self-promotions, non-dev, unpaid, stale
 */
export function assignLeadCategory(score, geminiData, isQualified) {
  if (!isQualified || score < 40) {
    return 'rejected';
  }

  const engagement = (geminiData.engagement_type || '').toLowerCase();
  const bStatus = (geminiData.budget_status || '').toLowerCase();
  const maxBudget = Number(geminiData.budget_max_usd) || Number(geminiData.budget_min_usd) || 0;

  // Agency contract view
  if (engagement === 'agency_subcontract') {
    return 'agency_contract';
  }

  // High priority paid view
  if (score >= 75 && (bStatus === 'confirmed' || maxBudget >= 1000)) {
    return 'high_priority';
  }

  // Budget unknown view
  if (bStatus === 'unknown' && score >= 60) {
    return 'budget_unknown';
  }

  // Needs manual review
  return 'manual_review';
}

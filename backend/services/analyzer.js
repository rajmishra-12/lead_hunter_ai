import { logger } from '../utils/logger.js';

/**
 * Heuristic-based job posting analyzer & intent classifier.
 * Bypasses simple keyword matching to identify buying intent and classify posts.
 */
export function analyzeLead(title, description = '') {
  const titleLower = title.trim().toLowerCase();
  const descriptionLower = description.toLowerCase();
  const text = `${titleLower} ${descriptionLower}`;

  // 1. Tech Stack Extraction
  const techMatches = [];
  if (text.includes('flutter')) techMatches.push('Flutter');
  if (text.includes('react native') || text.includes('reactnative')) techMatches.push('React Native');
  else if (text.includes('react')) techMatches.push('React');
  if (text.includes('next.js') || text.includes('nextjs')) techMatches.push('Next.js');
  if (text.includes('node') || text.includes('express')) techMatches.push('Node.js');
  if (text.includes('typescript')) techMatches.push('TypeScript');
  if (text.includes('python') || text.includes('django') || text.includes('fastapi')) techMatches.push('Python');
  if (text.includes('playwright') || text.includes('puppeteer')) techMatches.push('Playwright');
  if (text.includes('automation') || text.includes('scraping') || text.includes('scraper')) techMatches.push('Automation/Scraping');
  if (text.includes('ios') || text.includes('swift') || text.includes('xcode') || text.includes('swiftui')) techMatches.push('iOS');
  if (text.includes('android') || text.includes('kotlin')) techMatches.push('Android');
  if (text.includes('firebase')) techMatches.push('Firebase');
  if (text.includes('supabase')) techMatches.push('Supabase');
  if (text.includes('stripe') || text.includes('payment gateway')) techMatches.push('Stripe');
  if (text.includes('openai') || text.includes('chatgpt') || text.includes('gpt') || text.includes('llm') || text.includes(' ai ')) techMatches.push('AI/LLM');
  if (text.includes('api ') || text.includes('apis') || text.includes('rest api')) techMatches.push('APIs');
  if (text.includes('graphql')) techMatches.push('GraphQL');
  if (text.includes('mongodb') || text.includes('mongo')) techMatches.push('MongoDB');
  if (text.includes('postgresql') || text.includes('postgres')) techMatches.push('PostgreSQL');
  if (text.includes('mobile app') || text.includes('mobile')) techMatches.push('Mobile App');
  if (text.includes('web app') || text.includes('website') || text.includes('web dev')) techMatches.push('Web Development');

  const uniqueTech = [...new Set(techMatches)];
  const extracted_technologies = uniqueTech.join(', ') || 'General';

  // 2. Budget Extraction
  let estimatedBudget = 0;
  const flatBudgetRegexes = [
    /\b\$([0-9]{1,3}(?:,[0-9]{3})+)\b/g,
    /\b\$([0-9]{3,6})\b/g,
    /\b([0-9]{1,3})\s*k\s*(?:usd|dollars|budget)?\b/g,
    /\bbudget\s*(?:of|is|around)?\s*\$?([0-9]{3,6})\b/g,
    /\b\$([0-9]{1,3})\s*k\b/g
  ];

  let maxBudget = 0;
  for (const regex of flatBudgetRegexes) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      let val = match[1].replace(/,/g, '');
      let parsed = parseFloat(val);
      if (match[0].includes('k') && parsed < 1000) {
        parsed = parsed * 1000;
      }
      if (parsed > maxBudget && parsed < 150000) {
        maxBudget = parsed;
      }
    }
  }

  const hourlyRegex = /\b\$?([0-9]{2,3})\s*(?:-\s*\$?([0-9]{2,3}))?\s*\/\s*(?:hr|hour|h)\b/g;
  let hourlyMatch = hourlyRegex.exec(text);
  if (hourlyMatch) {
    const minHourly = parseFloat(hourlyMatch[1]);
    const maxHourly = hourlyMatch[2] ? parseFloat(hourlyMatch[2]) : minHourly;
    const avgHourly = (minHourly + maxHourly) / 2;
    if (maxBudget === 0) {
      maxBudget = avgHourly * 80;
    }
  }
  estimatedBudget = maxBudget;

  // 3. Urgency Detection
  let urgency_level = 'Low';
  if (text.includes('asap') || text.includes('urgent') || text.includes('today') || text.includes('this week') || text.includes('immediately') || text.includes('immediate')) {
    urgency_level = 'High';
  } else if (text.includes('looking to') || text.includes('starting soon') || text.includes('next month')) {
    urgency_level = 'Medium';
  }

  // ==========================================
  // STEP 1: Identify Poster Type
  // ==========================================
  let client_type = 'Client'; // Default

  const isFreelancerOrDevSelling = 
    titleLower.startsWith('[for hire]') ||
    titleLower.includes('for hire') ||
    text.includes('hire me') ||
    text.includes('available for work') ||
    text.includes('looking for work') ||
    text.includes('my services') ||
    text.includes('portfolio') ||
    text.includes('freelancer looking');

  if (isFreelancerOrDevSelling) {
    client_type = 'Freelancer';
  } else if (text.includes('recruiting') || text.includes('recruiter') || text.includes('headhunter')) {
    client_type = 'Recruiter';
  } else if (text.includes('agency') || text.includes('studio') || text.includes('consultancy') || text.includes('firm')) {
    client_type = 'Agency';
  } else if (text.includes('startup') || text.includes('founder') || text.includes('co-founder') || text.includes('cofounder')) {
    client_type = 'Startup Founder';
  } else if (text.includes('company') || text.includes('corporation') || text.includes('enterprise') || text.includes('inc.')) {
    client_type = 'Company';
  } else if (text.includes('student') || text.includes('university') || text.includes('school') || text.includes('learn')) {
    client_type = 'Student';
  } else if (text.includes('open source') || text.includes('maintainer')) {
    client_type = 'Open Source Maintainer';
  } else if (text.includes('developer') || text.includes('coder') || text.includes('programmer')) {
    client_type = 'Developer';
  }

  // ==========================================
  // STEP 2: Identify Intent
  // ==========================================
  let intent_category = 'Discussion'; // Default

  if (isFreelancerOrDevSelling || client_type === 'Freelancer') {
    intent_category = 'Selling Services';
  } else if (text.includes('looking for developer') || text.includes('need developer') || text.includes('need app') || text.includes('need website') || text.includes('budget') || text.includes('paid project') || text.includes('paid gig')) {
    intent_category = 'Buying Services';
  } else if (text.includes('hiring') || text.includes('job post') || text.includes('job opening')) {
    intent_category = 'Hiring';
  } else if (text.includes('cofounder') || text.includes('co-founder') || text.includes('cto') || text.includes('partner')) {
    intent_category = 'Looking for Cofounder';
  } else if (text.includes('how do i') || text.includes('how to') || text.includes('?') || text.includes('help') || text.includes('issue') || text.includes('error') || text.includes('bug')) {
    intent_category = 'Question';
  } else if (text.includes('tutorial') || text.includes('guide') || text.includes('blog') || text.includes('article')) {
    intent_category = 'Tutorial';
  } else if (text.includes('package') || text.includes('plugin') || text.includes('library') || text.includes('release')) {
    intent_category = 'Package Release';
  } else if (text.includes('open source') || text.includes('github.com')) {
    intent_category = 'Open Source';
  } else if (text.includes('showcase') || text.includes('built this') || text.includes('check out my')) {
    intent_category = 'Showcase';
  } else if (text.includes('networking') || text.includes('connect') || text.includes('linkedin')) {
    intent_category = 'Networking';
  }

  // ==========================================
  // STEP 3: Determine Opportunity Type
  // ==========================================
  let opportunity_type = 'Ignore'; // Default

  if (intent_category === 'Selling Services') {
    opportunity_type = 'Ignore';
  } else if (intent_category === 'Buying Services') {
    if (text.includes('contract') || text.includes('hourly') || text.includes('freelance')) {
      opportunity_type = 'Contract';
    } else {
      opportunity_type = 'Paid Client';
    }
  } else if (intent_category === 'Hiring') {
    if (client_type === 'Recruiter') {
      opportunity_type = 'Recruiter';
    } else if (client_type === 'Agency') {
      opportunity_type = 'Agency';
    } else {
      opportunity_type = 'Job';
    }
  } else if (intent_category === 'Looking for Cofounder') {
    opportunity_type = 'Partnership';
  } else if (intent_category === 'Question' || intent_category === 'Tutorial') {
    opportunity_type = 'Learning';
  }

  // ==========================================
  // STEP 4: Determine Potential Client (YES/NO)
  // ==========================================
  let is_potential_client = 1; // 1 = YES, 0 = NO
  let confidenceReasons = [];

  const devRegex = /\b(developer|dev|programmer|engineer|coder|fullstack|full-stack|frontend|front-end|backend|back-end|software|web|website|web app|mobile app|mobile|app|ios|android|flutter|react|react native|next\.js|nextjs|node\.js|nodejs|typescript|javascript|python|django|fastapi|api|scraping|scraper|bot|automation|firebase|supabase|stripe|mvp|saas|playwright|puppeteer)\b/i;
  const nonDevRegex = /\b(hvac|machinery|marine|mechanical|novel cover|book cover|illustration|illustrator|voice actor|audiobook|writer|copywriter|sales rep|account executive|real estate|cruise|ugc creator|video review|cad engineer)\b/i;
  const clientRegex = /\b(hiring|looking for|need|needed|wanted|paying|paid|hire|want to build|looking to build|contract|freelance|budget)\b/i;
  const sellerRegex = /\b(for hire|hire me|available for|my portfolio|offering my|seeking job|seeking role|seeking junior|open to work|open for work)\b/i;
  const showcaseRegex = /\b(i built|i created|i published|showcase|check out my|what do you think|how did you|i got tired)\b/i;

  // Rejection rules first
  if (client_type === 'Freelancer' && intent_category === 'Selling Services') {
    is_potential_client = 0;
    confidenceReasons.push('Poster is a Freelancer selling services');
  }
  if (titleLower.startsWith('[for hire]') || titleLower.startsWith('for hire') || sellerRegex.test(titleLower)) {
    is_potential_client = 0;
    confidenceReasons.push('Title matches freelancer seller keywords');
  }
  if (nonDevRegex.test(titleLower)) {
    is_potential_client = 0;
    confidenceReasons.push('Title indicates non-software role');
  }
  if (showcaseRegex.test(titleLower)) {
    is_potential_client = 0;
    confidenceReasons.push('Community showcase or self-promotion post');
  }

  // Client validation checks
  if (is_potential_client === 1) {
    const isDev = devRegex.test(text);
    const hasClientIntent = clientRegex.test(titleLower) || clientRegex.test(text.substring(0, 300));

    if (isDev && hasClientIntent) {
      is_potential_client = 1;
      confidenceReasons.push('Matches verified developer buyer intent');
    } else {
      is_potential_client = 0;
      confidenceReasons.push('Lacks verified developer hiring requirement');
    }
  }

  // Calculate Hiring Intent Score and confidence scores based on these steps
  let hiring_intent_score = 45;
  if (is_potential_client === 1) {
    hiring_intent_score = 75;
    if (estimatedBudget >= 1500) hiring_intent_score += 15;
    if (urgency_level === 'High') hiring_intent_score += 10;
  } else {
    hiring_intent_score = 15;
    if (intent_category === 'Selling Services') hiring_intent_score = 0;
  }
  hiring_intent_score = Math.max(0, Math.min(100, hiring_intent_score));

  let confidence_score = is_potential_client === 0 ? 95 : 75;
  if (estimatedBudget > 0) confidence_score += 10;
  confidence_score = Math.min(100, confidence_score);

  const confidence_reason = `Pipeline classification: Poster=${client_type}, Intent=${intent_category}, Type=${opportunity_type}, Potential Client=${is_potential_client === 1 ? 'YES' : 'NO'}. Log: ${confidenceReasons.join(', ') || 'Standard classification matched'}.`;

  // Lead score mapping
  let score = hiring_intent_score;
  if (is_potential_client === 1) {
    if (client_type === 'Startup Founder' || client_type === 'Company') {
      score += 15;
    }
    if (estimatedBudget >= 5000) score += 15;
  }
  score = Math.max(0, Math.min(100, score));

  // Heuristics for estimated hours
  let estimatedHours = 80;
  if (estimatedBudget > 5000) estimatedHours = 180;
  else if (estimatedBudget > 0 && estimatedBudget < 1500) estimatedHours = 30;

  // Suggested tech stack
  let suggestedTech = 'Flutter + Firebase';
  if (uniqueTech.includes('React Native')) {
    suggestedTech = 'React Native + Expo + Node.js (Express) + PostgreSQL';
  } else if (uniqueTech.includes('iOS') && uniqueTech.includes('Android')) {
    suggestedTech = 'SwiftUI (iOS) + Jetpack Compose (Android) + Firebase';
  }

  const risks = [];
  if (text.includes('equity only') || text.includes('rev share')) {
    risks.push('High risk of unpaid/delayed compensation (Equity/Revenue Share requested).');
  }
  if (risks.length === 0) {
    risks.push('No obvious high-risk keywords detected in the posting description.');
  }

  const summary = `Opportunity classified as ${opportunity_type} with ${urgency_level.toLowerCase()} urgency. Extracted Tech: ${extracted_technologies}.`;

  return {
    estimatedBudget,
    technology: extracted_technologies,
    platform: uniqueTech.includes('Flutter') ? 'Cross-Platform Mobile' : 'Mobile (General)',
    complexity: estimatedBudget > 5000 ? 'High' : (estimatedBudget < 1500 && estimatedBudget > 0 ? 'Low' : 'Medium'),
    category: 'Mobile App Development',
    urgency: urgency_level,
    clientQuality: score >= 70 ? 'Excellent' : (score < 40 ? 'Poor' : 'Good'),
    estimatedHours,
    suggestedTech,
    risks: risks.join(' | '),
    summary,
    score,
    intent_category,
    hiring_intent_score,
    confidence_score,
    confidence_reason,
    client_type,
    extracted_technologies,
    urgency_level,
    opportunity_type,
    is_potential_client
  };
}

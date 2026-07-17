import { logger } from '../utils/logger.js';

/**
 * Heuristic-based job posting analyzer & scorer.
 * Operates without external paid API dependencies using regular expressions and heuristics.
 */
export function analyzeLead(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  
  // 1. Extract Technologies & Platforms
  const techMatches = [];
  let platform = 'Mobile (General)';
  
  if (text.includes('flutter')) {
    techMatches.push('Flutter');
    platform = 'Cross-Platform Mobile';
  }
  if (text.includes('react native') || text.includes('reactnative')) {
    techMatches.push('React Native');
    platform = 'Cross-Platform Mobile';
  }
  if (text.includes('ios') || text.includes('swift') || text.includes('xcode') || text.includes('ipad') || text.includes('iphone')) {
    techMatches.push('iOS (Swift)');
    if (platform === 'Mobile (General)') platform = 'iOS';
    else if (platform.includes('Android')) platform = 'Native iOS & Android';
  }
  if (text.includes('android') || text.includes('kotlin') || text.includes('java ')) {
    techMatches.push('Android (Kotlin)');
    if (platform === 'Mobile (General)') platform = 'Android';
    else if (platform.includes('iOS')) platform = 'Native iOS & Android';
  }
  if (text.includes('firebase')) {
    techMatches.push('Firebase');
  }
  if (text.includes('node') || text.includes('express')) {
    techMatches.push('Node.js');
  }
  if (text.includes('api') || text.includes('rest') || text.includes('graphql')) {
    techMatches.push('APIs');
  }
  if (text.includes('ai ') || text.includes('openai') || text.includes('gpt') || text.includes('llm') || text.includes('gemini') || text.includes('artificial intelligence')) {
    techMatches.push('AI Integration');
  }
  if (text.includes('saas')) {
    techMatches.push('SaaS');
  }
  
  const uniqueTech = [...new Set(techMatches)];
  const technologyString = uniqueTech.join(', ') || 'Mobile';

  // 2. Extract Budget Heuristics
  let estimatedBudget = 0;
  
  // Look for flat dollar rates (e.g. $1,500, $5k, $10000)
  const flatBudgetRegexes = [
    /\b\$([0-9]{1,3}(?:,[0-9]{3})+)\b/g, // $1,500
    /\b\$([0-9]{3,6})\b/g,               // $1500
    /\b([0-9]{1,3})\s*k\s*(?:usd|dollars|budget)?\b/g, // 5k or 5 k
    /\bbudget\s*(?:of|is|around)?\s*\$?([0-9]{3,6})\b/g, // budget is 1500
    /\b\$([0-9]{1,3})\s*k\b/g            // $5k
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
      if (parsed > maxBudget && parsed < 150000) { // Limit sanity check
        maxBudget = parsed;
      }
    }
  }

  // Look for hourly rates (e.g. $40/hr, $30 - $60/hour)
  const hourlyRegex = /\b\$?([0-9]{2,3})\s*(?:-\s*\$?([0-9]{2,3}))?\s*\/\s*(?:hr|hour|h)\b/g;
  let hourlyMatch = hourlyRegex.exec(text);
  if (hourlyMatch) {
    const minHourly = parseFloat(hourlyMatch[1]);
    const maxHourly = hourlyMatch[2] ? parseFloat(hourlyMatch[2]) : minHourly;
    const avgHourly = (minHourly + maxHourly) / 2;
    // Assume average mobile project size is 80 hours for hourly estimation if no flat budget
    if (maxBudget === 0) {
      maxBudget = avgHourly * 80;
    }
  }

  estimatedBudget = maxBudget;

  // 3. Category & Complexity
  let category = 'Mobile App Development';
  if (text.includes('consult') || text.includes('advisor') || text.includes('coaching')) {
    category = 'Consulting / Advisory';
  } else if (text.includes('maintain') || text.includes('fix') || text.includes('bug')) {
    category = 'App Maintenance & Bug Fixes';
  }

  let complexity = 'Medium';
  let estimatedHours = 80;
  if (estimatedBudget > 5000 || text.includes('complex') || text.includes('long term') || text.includes('full time')) {
    complexity = 'High';
    estimatedHours = 180;
  } else if (estimatedBudget > 0 && estimatedBudget < 1500 || text.includes('simple') || text.includes('quick fix') || text.includes('mvp')) {
    complexity = 'Low';
    estimatedHours = 30;
  }

  // 4. Urgency
  let urgency = 'Medium';
  if (text.includes('urgent') || text.includes('asap') || text.includes('immediate') || text.includes('right away') || text.includes('fast-track')) {
    urgency = 'High';
  } else if (text.includes('flexible') || text.includes('someday') || text.includes('when you have time')) {
    urgency = 'Low';
  }

  // 5. Client Quality
  let clientQuality = 'Good';
  if (text.includes('funded') || text.includes('established') || text.includes('payment verified') || text.includes('agency') || text.includes('enterprise')) {
    clientQuality = 'Excellent';
  } else if (text.includes('equity only') || text.includes('rev share') || text.includes('no budget') || text.includes('cheap')) {
    clientQuality = 'Poor';
  }

  // 6. Risks Heuristics
  const risks = [];
  if (text.includes('equity only') || text.includes('rev share') || text.includes('revenue share')) {
    risks.push('High risk of unpaid/delayed compensation (Equity/Revenue Share requested).');
  }
  if (text.includes('cheap') || text.includes('low budget') || (estimatedBudget > 0 && estimatedBudget < 500)) {
    risks.push('Low budget might lead to scope creep or client dissatisfaction.');
  }
  if (text.includes('urgent') || text.includes('asap') || text.includes('deadline')) {
    risks.push('Tight timeline/high urgency might require weekend or overtime work.');
  }
  if (text.includes('legacy') || text.includes('old codebase') || text.includes('fix someone') || text.includes('mess')) {
    risks.push('Existing codebase may have technical debt or poorly written legacy code.');
  }
  if (risks.length === 0) {
    risks.push('No obvious high-risk keywords detected in the posting description.');
  }

  // 7. Suggested Tech Stack
  let suggestedTech = 'Flutter + Firebase';
  if (uniqueTech.includes('React Native')) {
    suggestedTech = 'React Native + Expo + Node.js (Express) + PostgreSQL';
  } else if (uniqueTech.includes('iOS (Swift)') && uniqueTech.includes('Android (Kotlin)')) {
    suggestedTech = 'SwiftUI (iOS) + Kotlin/Compose (Android) + Node.js backend';
  } else if (uniqueTech.includes('iOS (Swift)')) {
    suggestedTech = 'SwiftUI (Native iOS) + Firebase Backend';
  } else if (uniqueTech.includes('Android (Kotlin)')) {
    suggestedTech = 'Kotlin Jetpack Compose (Native Android) + Supabase/Firebase';
  } else if (uniqueTech.includes('Flutter')) {
    suggestedTech = 'Flutter (Dart) + Firebase + Node.js API';
  }

  // 8. Lead Score (0 - 100)
  let score = 50; // Starting baseline

  // Budget score factor (up to 30 pts)
  if (estimatedBudget >= 5000) score += 30;
  else if (estimatedBudget >= 2000) score += 20;
  else if (estimatedBudget >= 1000) score += 10;
  else if (estimatedBudget > 0 && estimatedBudget < 500) score -= 15; // penalize low budget

  // Urgency factor (up to 15 pts)
  if (urgency === 'High') score += 15;
  else if (urgency === 'Medium') score += 5;

  // Tech match (up to 20 pts)
  if (uniqueTech.includes('Flutter') || uniqueTech.includes('React Native')) score += 20;
  else if (uniqueTech.includes('iOS (Swift)') || uniqueTech.includes('Android (Kotlin)')) score += 15;

  // Keywords (up to 15 pts)
  if (text.includes('startup') || text.includes('mvp') || text.includes('hiring') || text.includes('looking for developer')) {
    score += 15;
  }

  // Quality checks (up to 20 pts)
  if (clientQuality === 'Excellent') score += 20;
  if (clientQuality === 'Poor') score -= 30; // Heavy penalty

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Summary generation
  let summary = `Client is looking for a developer for a ${complexity.toLowerCase()}-complexity project.`;
  if (uniqueTech.length > 0) {
    summary += ` The key requirements focus on: ${uniqueTech.join(', ')}.`;
  }
  if (estimatedBudget > 0) {
    summary += ` The estimated budget detected is approximately $${estimatedBudget.toLocaleString()}.`;
  } else {
    summary += ` Budget details were not explicitly stated.`;
  }

  return {
    estimatedBudget,
    technology: technologyString,
    platform,
    complexity,
    category,
    urgency,
    clientQuality,
    estimatedHours,
    suggestedTech,
    risks: risks.join(' | '),
    summary,
    score
  };
}

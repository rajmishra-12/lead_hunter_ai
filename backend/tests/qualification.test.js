import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { preFilterCandidate, calculateLeadScore, assignLeadCategory, isFreshWithinDays } from '../services/qualifier.js';
import { analyzeWithGemini } from '../services/geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const nowSec = Math.floor(Date.now() / 1000);
const ONE_DAY = 86400;

/**
 * 30 Test Fixtures covering:
 * - 10 Real Buyer-Intent Leads across multiple stacks
 * - 5 Developers looking for work (Self-promotions / sellers)
 * - 5 Unrelated non-dev jobs
 * - 5 Discussions, megathreads, tutorials, or open-source announcements
 * - 5 Stale (>7d), unpaid/equity, or unsuitable posts
 */
export const testFixtures = [
  // =========================================================================
  // GROUP 1: 10 Real Buyer-Intent Opportunities (Should Qualify)
  // =========================================================================
  {
    id: 'lead-01',
    group: 'Buyer Intent',
    title: '[Hiring] Looking for a Flutter developer to finish our paid app',
    description: 'We have an existing Flutter mobile app with Firebase backend. Need an experienced developer to implement push notifications, fix state management issues, and prepare build for App Store & Play Store. Budget is $1,500 - $2,500 USD.',
    source: 'r/forhire',
    author: 'client_founder',
    url: 'https://reddit.com/r/forhire/comments/test01',
    created_time: nowSec - ONE_DAY * 1, // 1 day old
    shouldQualify: true,
    expectedCategory: 'high_priority',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'direct_freelance',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 1500,
      budget_max_usd: 2500,
      budget_status: 'confirmed',
      project_summary: 'Finish Flutter mobile app with Firebase and prepare for app store release.',
      required_skills: ['Flutter', 'Dart', 'Firebase'],
      scope_clarity: 'high',
      urgency: 'high',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 92,
      qualification_reason: 'Explicit client hiring an experienced Flutter developer for defined paid mobile milestone.',
      recommended_action: 'Send Flutter portfolio and past Firebase app references.'
    }
  },
  {
    id: 'lead-02',
    group: 'Buyer Intent',
    title: '[Hiring] Need a React/Next.js developer to build our company website',
    description: 'Looking for a skilled frontend engineer to build our B2B SaaS marketing site using Next.js 14, TypeScript, and Tailwind CSS. Figma designs are ready. Fixed budget $2,000 USD.',
    source: 'r/freelance_forhire',
    author: 'saas_marketing_lead',
    url: 'https://reddit.com/r/freelance_forhire/comments/test02',
    created_time: nowSec - ONE_DAY * 2, // 2 days old
    shouldQualify: true,
    expectedCategory: 'high_priority',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'direct_freelance',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 2000,
      budget_max_usd: 2000,
      budget_status: 'confirmed',
      project_summary: 'Build B2B SaaS marketing website with Next.js 14 and Tailwind from Figma.',
      required_skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
      scope_clarity: 'high',
      urgency: 'medium',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 90,
      qualification_reason: 'Direct client with confirmed $2,000 budget and complete Figma designs.',
      recommended_action: 'Share Next.js production examples and propose timeline.'
    }
  },
  {
    id: 'lead-03',
    group: 'Buyer Intent',
    title: '[Hiring] Need help integrating Stripe into my existing app',
    description: 'I run a booking service and need a developer to connect Stripe Checkout, handle webhook events, and store transaction receipts in PostgreSQL database. DM with your hourly rate or estimate.',
    source: 'r/forhire',
    author: 'biz_owner_dan',
    url: 'https://reddit.com/r/forhire/comments/test03',
    created_time: nowSec - 3600 * 6, // 6 hours old
    shouldQualify: true,
    expectedCategory: 'budget_unknown', // Budget unknown but clear paid intent -> retain as budget_unknown
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'paid_technical_task',
      payment_status: 'budget_unknown',
      budget_min_usd: 0,
      budget_max_usd: 0,
      budget_status: 'unknown',
      project_summary: 'Integrate Stripe checkout and webhooks into an existing booking application.',
      required_skills: ['Stripe API', 'Node.js', 'PostgreSQL'],
      scope_clarity: 'medium',
      urgency: 'high',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 83,
      qualification_reason: 'Real technical task with clear buyer intent. Budget undisclosed but high potential.',
      recommended_action: 'DM with Stripe integration experience and request project scope details.'
    }
  },
  {
    id: 'lead-04',
    group: 'Buyer Intent',
    title: '[Hiring] Need an experienced Node.js contractor for a paid API project',
    description: 'We need a backend developer to build REST endpoints in Node.js/Express, connect PostgreSQL, and write automated tests. Hourly rate $45-$60/hr or fixed $1,800 milestone.',
    source: 'r/jobbit',
    author: 'tech_lead_rachel',
    url: 'https://reddit.com/r/jobbit/comments/test04',
    created_time: nowSec - ONE_DAY * 3, // 3 days old
    shouldQualify: true,
    expectedCategory: 'high_priority',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'direct_freelance',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 1800,
      budget_max_usd: 1800,
      budget_status: 'confirmed',
      project_summary: 'Develop REST endpoints in Node.js/Express with PostgreSQL and tests.',
      required_skills: ['Node.js', 'Express', 'PostgreSQL', 'Jest'],
      scope_clarity: 'high',
      urgency: 'medium',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 89,
      qualification_reason: 'Clear backend API development requirement with confirmed $1,800 milestone.',
      recommended_action: 'Send backend architecture examples and confirm availability.'
    }
  },
  {
    id: 'lead-05',
    group: 'Buyer Intent',
    title: '[Hiring] Software agency looking for React Native contractor for client overflow',
    description: 'Our software agency has more mobile development contracts than our internal team can handle. Seeking a dependable contractor for React Native development over the next 2 months. Budget $3,000/mo.',
    source: 'r/forhire',
    author: 'agency_director_mike',
    url: 'https://reddit.com/r/forhire/comments/test05',
    created_time: nowSec - 3600 * 18, // 18 hours old
    shouldQualify: true,
    expectedCategory: 'agency_contract',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'agency_subcontract',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 3000,
      budget_max_usd: 6000,
      budget_status: 'confirmed',
      project_summary: 'Agency subcontracting React Native mobile developer for ongoing client projects.',
      required_skills: ['React Native', 'Mobile Development', 'TypeScript'],
      scope_clarity: 'high',
      urgency: 'high',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 94,
      qualification_reason: 'Agency overflow opportunity with recurring monthly contract budget of $3,000.',
      recommended_action: 'Pitch agency white-label capabilities and mobile project case studies.'
    }
  },
  {
    id: 'lead-06',
    group: 'Buyer Intent',
    title: '[Hiring] Need developer to build automated web scraper and lead pipeline',
    description: 'Looking for a developer to build an automated web scraper with Playwright or Python to extract directory records and sync into Airtable. Budget: $1,200.',
    source: 'r/freelance_forhire',
    author: 'ops_guru',
    url: 'https://reddit.com/r/freelance_forhire/comments/test06',
    created_time: nowSec - ONE_DAY * 4, // 4 days old
    shouldQualify: true,
    expectedCategory: 'high_priority',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'direct_freelance',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 1200,
      budget_max_usd: 1200,
      budget_status: 'confirmed',
      project_summary: 'Build automated web scraping tool using Playwright/Python with Airtable export.',
      required_skills: ['Web Scraping', 'Playwright', 'Python', 'Airtable API'],
      scope_clarity: 'high',
      urgency: 'medium',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 87,
      qualification_reason: 'Automated scraping requirement with explicit $1,200 budget.',
      recommended_action: 'Demonstrate past scraper architectures and anti-bot handling.'
    }
  },
  {
    id: 'lead-07',
    group: 'Buyer Intent',
    title: '[Hiring] Urgent: Fix memory leak and slow API responses in Express/Node backend',
    description: 'Production server is spiking CPU on heavy load. Need an experienced backend dev to profile, optimize database queries, and fix the leak today. Paying $1,000 for quick resolution.',
    source: 'r/forhire',
    author: 'startup_cto',
    url: 'https://reddit.com/r/forhire/comments/test07',
    created_time: nowSec - 3600 * 5, // 5 hours old
    shouldQualify: true,
    expectedCategory: 'high_priority',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'paid_technical_task',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 1000,
      budget_max_usd: 1000,
      budget_status: 'confirmed',
      project_summary: 'Urgent production debugging, memory leak analysis, and Express query optimization.',
      required_skills: ['Node.js', 'Express', 'Performance Profiling', 'Database Optimization'],
      scope_clarity: 'high',
      urgency: 'high',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 95,
      qualification_reason: 'Urgent production debugging with confirmed $1,000 immediate payout.',
      recommended_action: 'Contact immediately emphasizing rapid troubleshooting availability.'
    }
  },
  {
    id: 'lead-08',
    group: 'Buyer Intent',
    title: '[Hiring] Developer needed to create internal analytics dashboard',
    description: 'We want a clean dashboard built with React or Next.js to display customer analytics from our PostgreSQL backend. Looking to hire immediately. Please share past dashboard work and estimates.',
    source: 'r/jobbit',
    author: 'finance_ops',
    url: 'https://reddit.com/r/jobbit/comments/test08',
    created_time: nowSec - ONE_DAY * 2, // 2 days old
    shouldQualify: true,
    expectedCategory: 'budget_unknown',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'direct_freelance',
      payment_status: 'budget_unknown',
      budget_min_usd: 0,
      budget_max_usd: 0,
      budget_status: 'unknown',
      project_summary: 'Internal analytics dashboard in React/Next.js connected to PostgreSQL.',
      required_skills: ['React', 'Next.js', 'PostgreSQL', 'Charts/DataViz'],
      scope_clarity: 'medium',
      urgency: 'high',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 82,
      qualification_reason: 'Clear business requirement for internal dashboard. Budget undisclosed.',
      recommended_action: 'Show dashboard mockups or live admin panels and ask for schema details.'
    }
  },
  {
    id: 'lead-09',
    group: 'Buyer Intent',
    title: '[Hiring] Need developer to integrate OpenAI API into existing SaaS platform',
    description: 'Our web platform needs an AI summarization and assistant feature integrated into our Node/React stack. Looking for someone with LLM API experience. Budget $1,500.',
    source: 'r/forhire',
    author: 'product_head_alex',
    url: 'https://reddit.com/r/forhire/comments/test09',
    created_time: nowSec - ONE_DAY * 1, // 1 day old
    shouldQualify: true,
    expectedCategory: 'high_priority',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'direct_freelance',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 1500,
      budget_max_usd: 1500,
      budget_status: 'confirmed',
      project_summary: 'Integrate OpenAI LLM APIs into existing SaaS web application.',
      required_skills: ['OpenAI API', 'Node.js', 'React', 'Prompt Engineering'],
      scope_clarity: 'high',
      urgency: 'medium',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 88,
      qualification_reason: 'Explicit AI integration task with confirmed $1,500 budget.',
      recommended_action: 'Share AI app integrations and streaming completion examples.'
    }
  },
  {
    id: 'lead-10',
    group: 'Buyer Intent',
    title: '[Hiring] Looking for full-stack developer to build MVP for local delivery app',
    description: 'Non-technical founder looking for a developer to build an MVP with cross-platform mobile (Flutter or React Native) and simple admin panel. Seed funded, paying $4,000 for milestone 1.',
    source: 'r/forhire',
    author: 'delivery_startup',
    url: 'https://reddit.com/r/forhire/comments/test10',
    created_time: nowSec - ONE_DAY * 3, // 3 days old
    shouldQualify: true,
    expectedCategory: 'high_priority',
    simulatedGemini: {
      is_hiring: true,
      author_intent: 'buyer',
      is_development_related: true,
      engagement_type: 'direct_freelance',
      payment_status: 'paid_or_budgeted',
      budget_min_usd: 4000,
      budget_max_usd: 4000,
      budget_status: 'confirmed',
      project_summary: 'Build MVP for delivery app using Flutter/React Native and admin dashboard.',
      required_skills: ['Flutter', 'React Native', 'Mobile MVP', 'Backend'],
      scope_clarity: 'high',
      urgency: 'high',
      freshness_valid: true,
      exclusion_reason: null,
      lead_score: 93,
      qualification_reason: 'Well-funded startup MVP build with confirmed $4,000 budget.',
      recommended_action: 'Provide MVP architecture roadmap and cross-platform case studies.'
    }
  },

  // =========================================================================
  // GROUP 2: 5 Developers Looking for Work (Should Reject)
  // =========================================================================
  {
    id: 'lead-11',
    group: 'Freelancer Self-Promotion',
    title: '[For Hire] Flutter developer available for freelance work',
    description: 'I have 3 years of experience building Flutter apps with Firebase and REST APIs. Check my portfolio at github.com/dev. Rates $25/hr. Available 30 hrs/week.',
    source: 'r/forhire',
    author: 'freelancer_bob',
    url: 'https://reddit.com/r/forhire/comments/test11',
    created_time: nowSec - 3600 * 12,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-12',
    group: 'Freelancer Self-Promotion',
    title: '[For Hire] Full-Stack React & Node.js Developer available for hire',
    description: 'Hey everyone, I am looking for my next opportunity as a remote developer. Experienced in TypeScript, Next.js, Express, MongoDB. DM for resume.',
    source: 'r/freelance_forhire',
    author: 'react_dev_susan',
    url: 'https://reddit.com/r/freelance_forhire/comments/test12',
    created_time: nowSec - ONE_DAY * 1,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-13',
    group: 'Freelancer Self-Promotion',
    title: 'Hire me as a React Native developer - Check out my portfolio',
    description: 'Just published my new portfolio showcasing 4 production mobile apps. Seeking remote contracts or freelance gigs. Contact me via DM.',
    source: 'r/jobbit',
    author: 'mobile_coder_john',
    url: 'https://reddit.com/r/jobbit/comments/test13',
    created_time: nowSec - ONE_DAY * 2,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-14',
    group: 'Freelancer Self-Promotion',
    title: 'Offering web development services: Modern websites and web apps',
    description: 'I am offering affordable custom web development for small businesses using HTML, CSS, JavaScript, and WordPress. Prices start at $300.',
    source: 'r/forhire',
    author: 'web_builder_sam',
    url: 'https://reddit.com/r/forhire/comments/test14',
    created_time: nowSec - ONE_DAY * 3,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-15',
    group: 'Freelancer Self-Promotion',
    title: 'Seeking remote developer jobs - Junior SDE with Python and React',
    description: 'Recent computer science graduate seeking entry-level or junior software engineer role. Open to full-time or contract work.',
    source: 'r/jobbit',
    author: 'junior_grad',
    url: 'https://reddit.com/r/jobbit/comments/test15',
    created_time: nowSec - 3600 * 20,
    shouldQualify: false,
    expectedPreFilterPass: false
  },

  // =========================================================================
  // GROUP 3: 5 Unrelated Non-Dev Jobs (Should Reject)
  // =========================================================================
  {
    id: 'lead-16',
    group: 'Unrelated Job',
    title: '[Hiring] Customer Service Associate — Healthcare Support (Remote)',
    description: 'We are looking for compassionate customer service representatives to answer patient calls, schedule appointments, and update medical records. Hourly $18/hr.',
    source: 'r/remotejobs',
    author: 'health_corp_hr',
    url: 'https://reddit.com/r/remotejobs/comments/test16',
    created_time: nowSec - ONE_DAY * 1,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-17',
    group: 'Unrelated Job',
    title: '[Hiring] Outbound Sales Representative / Cold Caller for B2B Agency',
    description: 'Looking for an aggressive appointment setter and sales rep to dial 100 leads per day. Commission + base pay. Fluent English required.',
    source: 'r/forhire',
    author: 'sales_firm',
    url: 'https://reddit.com/r/forhire/comments/test17',
    created_time: nowSec - ONE_DAY * 2,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-18',
    group: 'Unrelated Job',
    title: '[Hiring] Technical Recruiter to source senior engineers',
    description: 'Growing tech company needs a freelance technical recruiter to help screen candidates on LinkedIn and coordinate interviews. Budget $1,500/mo.',
    source: 'r/jobbit',
    author: 'talent_scout',
    url: 'https://reddit.com/r/jobbit/comments/test18',
    created_time: nowSec - ONE_DAY * 2,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-19',
    group: 'Unrelated Job',
    title: '[Hiring] Data entry operator needed for Excel spreadsheet cleanup',
    description: 'Need someone to copy data from PDF invoices into Excel tables. No programming required. Simple copy-paste work. $15/hr.',
    source: 'r/freelance_forhire',
    author: 'admin_help',
    url: 'https://reddit.com/r/freelance_forhire/comments/test19',
    created_time: nowSec - 3600 * 8,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-20',
    group: 'Unrelated Job',
    title: '[Hiring] Virtual Assistant — remote, USA for calendar and email management',
    description: 'Seeking an organized executive assistant to manage inbox, calendar, and travel bookings. 10 hours per week.',
    source: 'r/remotejobs',
    author: 'exec_support',
    url: 'https://reddit.com/r/remotejobs/comments/test20',
    created_time: nowSec - ONE_DAY * 3,
    shouldQualify: false,
    expectedPreFilterPass: false
  },

  // =========================================================================
  // GROUP 4: 5 Discussions, Megathreads, Tutorials, or Noise (Should Reject)
  // =========================================================================
  {
    id: 'lead-21',
    group: 'Discussions / Noise',
    title: 'Thankful Thursday: Free Resources and Tools for Developers',
    description: 'Share your favorite developer tools, libraries, and open-source packages that made your life easier this week! Megathread rules apply.',
    source: 'r/webdev',
    author: 'automod',
    url: 'https://reddit.com/r/webdev/comments/test21',
    created_time: nowSec - 3600 * 14,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-22',
    group: 'Discussions / Noise',
    title: 'How are you handling state management in Flutter with Riverpod 2.0?',
    description: 'I have been experimenting with code generation in Riverpod. What architecture patterns do you recommend for large enterprise mobile apps?',
    source: 'r/FlutterDev',
    author: 'flutter_fanatic',
    url: 'https://reddit.com/r/FlutterDev/comments/test22',
    created_time: nowSec - ONE_DAY * 2,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-23',
    group: 'Discussions / Noise',
    title: 'Weekly discussion: What did you build this week?',
    description: 'Tell us about your weekend coding projects, open-source commits, or side hustles! Keep it civil and follow subreddit guidelines.',
    source: 'r/reactjs',
    author: 'react_mod',
    url: 'https://reddit.com/r/reactjs/comments/test23',
    created_time: nowSec - ONE_DAY * 1,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-24',
    group: 'Discussions / Noise',
    title: 'What I learned after launching 5 SaaS products in 12 months',
    description: 'Here are the key takeaways from my journey building Micro-SaaS tools. None made millions, but 2 are generating $1k MRR. Discussion inside.',
    source: 'r/SideProject',
    author: 'indie_hacker',
    url: 'https://reddit.com/r/SideProject/comments/test24',
    created_time: nowSec - ONE_DAY * 4,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-25',
    group: 'Discussions / Noise',
    title: '[Meta] Rules reminder regarding minimum karma requirements',
    description: 'Please review our rules regarding posting guidelines. All hiring posts require verified accounts with at least 50 comment karma.',
    source: 'r/forhire',
    author: 'forhire_moderator',
    url: 'https://reddit.com/r/forhire/comments/test25',
    created_time: nowSec - ONE_DAY * 5,
    shouldQualify: false,
    expectedPreFilterPass: false
  },

  // =========================================================================
  // GROUP 5: 5 Stale (>7d), Unpaid/Equity, or Unsuitable Posts (Should Reject)
  // =========================================================================
  {
    id: 'lead-26',
    group: 'Stale / Unpaid / Unsuitable',
    title: '[Hiring] Looking for a React developer to build interactive dashboard',
    description: 'Need a contractor for 1 week to build analytics widgets. Paying $1,200. Post was published 9 days ago.',
    source: 'r/forhire',
    author: 'old_poster',
    url: 'https://reddit.com/r/forhire/comments/test26',
    created_time: nowSec - ONE_DAY * 9, // 9 days old -> Stale (>7 days)
    shouldQualify: false,
    expectedPreFilterPass: false // Disqualified by rolling 7-day freshness check
  },
  {
    id: 'lead-27',
    group: 'Stale / Unpaid / Unsuitable',
    title: 'Looking for a co-founder, equity only for revolutionary social platform',
    description: 'I have a game-changing social media app concept. Looking for a full-stack technical co-founder to build the MVP. No salary initially, offering 20% equity upon funding.',
    source: 'r/forhire',
    author: 'idea_man',
    url: 'https://reddit.com/r/forhire/comments/test27',
    created_time: nowSec - ONE_DAY * 2,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-28',
    group: 'Stale / Unpaid / Unsuitable',
    title: '[Hiring] Unpaid developer internship for mobile app startup',
    description: 'Great learning opportunity for college students to gain experience building a mobile app. Unpaid role with letter of recommendation.',
    source: 'r/jobbit',
    author: 'cheap_startup',
    url: 'https://reddit.com/r/jobbit/comments/test28',
    created_time: nowSec - ONE_DAY * 3,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-29',
    group: 'Stale / Unpaid / Unsuitable',
    title: '[Hiring] Dev',
    description: '[deleted by user]',
    source: 'r/forhire',
    author: 'ghost_user',
    url: 'https://reddit.com/r/forhire/comments/test29',
    created_time: nowSec - ONE_DAY * 1,
    shouldQualify: false,
    expectedPreFilterPass: false
  },
  {
    id: 'lead-30',
    group: 'Stale / Unpaid / Unsuitable',
    title: 'Need someone to code my idea for free, profit share only when we make millions',
    description: 'I do not have money to pay right now, but if you code the website we can split the profits 50/50. 0 budget guaranteed.',
    source: 'r/freelance_forhire',
    author: 'speculator_sam',
    url: 'https://reddit.com/r/freelance_forhire/comments/test30',
    created_time: nowSec - ONE_DAY * 2,
    shouldQualify: false,
    expectedPreFilterPass: false
  }
];

/**
 * Runs the qualification test suite.
 */
export async function runQualificationTests() {
  console.log('\n================================================================');
  console.log(' LeadHunter AI: Lead Qualification & Filtering Test Suite (30 Cases)');
  console.log('================================================================\n');

  let tp = 0; // True Positive: Expected Qualify and Did Qualify
  let fp = 0; // False Positive: Expected Reject but Qualified (CRITICAL: Must be 0)
  let tn = 0; // True Negative: Expected Reject and Did Reject
  let fn = 0; // False Negative: Expected Qualify but Rejected

  const results = [];

  for (let i = 0; i < testFixtures.length; i++) {
    const fixture = testFixtures[i];
    const indexStr = String(i + 1).padStart(2, '0');

    // Step 1: Evaluate Deterministic Pre-Filter
    const preCheck = preFilterCandidate(fixture);

    let isQualified = false;
    let score = 0;
    let category = 'rejected';
    let evaluationReason = '';

    if (!preCheck.pass) {
      isQualified = false;
      score = 0;
      category = 'rejected';
      evaluationReason = `Pre-filter Disqualified: ${preCheck.reason}`;
    } else {
      // Step 2: Scoring & Qualification Engine
      // In tests, if simulatedGemini is provided, use it; otherwise test rejection rules
      const geminiResult = fixture.simulatedGemini || {
        is_hiring: false,
        author_intent: 'unrelated',
        is_development_related: false,
        engagement_type: 'other',
        payment_status: 'unpaid_or_equity',
        budget_min_usd: 0,
        budget_max_usd: 0,
        budget_status: 'unpaid',
        project_summary: 'Not a development lead',
        required_skills: [],
        scope_clarity: 'low',
        urgency: 'low',
        freshness_valid: isFreshWithinDays(fixture.created_time, 7),
        exclusion_reason: 'Disqualified',
        lead_score: 0,
        qualification_reason: 'Disqualified',
        recommended_action: 'Discard'
      };

      const scoreResult = calculateLeadScore(geminiResult, fixture);
      score = scoreResult.score;
      isQualified = scoreResult.isQualified;
      category = assignLeadCategory(score, geminiResult, isQualified);
      evaluationReason = isQualified 
        ? `Qualified (Score: ${score}, Category: ${category})`
        : `Disqualified (Score: ${score}, Reason: ${scoreResult.exclusionReason})`;
    }

    const testPassed = isQualified === fixture.shouldQualify;

    if (fixture.shouldQualify && isQualified) {
      tp++;
    } else if (!fixture.shouldQualify && !isQualified) {
      tn++;
    } else if (!fixture.shouldQualify && isQualified) {
      fp++;
    } else if (fixture.shouldQualify && !isQualified) {
      fn++;
    }

    results.push({
      id: fixture.id,
      indexStr,
      group: fixture.group,
      title: fixture.title,
      shouldQualify: fixture.shouldQualify,
      isQualified,
      score,
      category,
      testPassed,
      evaluationReason
    });

    const statusBadge = testPassed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${indexStr}/30] ${statusBadge} | ${fixture.group.padEnd(26)} | "${fixture.title.substring(0, 50).padEnd(50)}"`);
    console.log(`       Outcome: ${evaluationReason}`);
  }

  // Calculate Metrics
  const total = testFixtures.length;
  const precision = (tp + fp) > 0 ? ((tp / (tp + fp)) * 100).toFixed(1) : '0.0';
  const recall = (tp + fn) > 0 ? ((tp / (tp + fn)) * 100).toFixed(1) : '0.0';
  const accuracy = (((tp + tn) / total) * 100).toFixed(1);

  console.log('\n================================================================');
  console.log(' TEST SUITE RESULTS & METRICS');
  console.log('================================================================');
  console.log(`Total Cases Evaluated: ${total}`);
  console.log(`- True Positives  (Buyer Leads Qualified)   : ${tp} / 10`);
  console.log(`- True Negatives  (Noise/Jobs Disqualified) : ${tn} / 20`);
  console.log(`- False Positives (Bad Leads Leaked)        : ${fp} (Target: 0)`);
  console.log(`- False Negatives (Good Leads Missed)       : ${fn} (Target: 0)`);
  console.log('----------------------------------------------------------------');
  console.log(`🎯 Precision: ${precision}% (Precision measures absence of junk/noise)`);
  console.log(`🎯 Recall   : ${recall}% (Recall measures capture of genuine client work)`);
  console.log(`🎯 Accuracy : ${accuracy}%`);
  console.log('================================================================\n');

  // Verify Live Gemini Developer API connectivity if API key is configured
  if (process.env.GEMINI_API_KEY) {
    console.log('Testing live Google Gemini API qualification call...');
    try {
      const samplePost = testFixtures[0]; // Looking for a Flutter developer to finish our paid app
      const liveResult = await analyzeWithGemini(samplePost.title, samplePost.description, samplePost);
      console.log('✅ Live Gemini Developer API responded successfully!');
      console.log('   - Model used            :', process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite');
      console.log('   - is_hiring             :', liveResult.is_hiring);
      console.log('   - author_intent         :', liveResult.author_intent);
      console.log('   - is_development_related:', liveResult.is_development_related);
      console.log('   - engagement_type       :', liveResult.engagement_type);
      console.log('   - budget_status         :', liveResult.budget_status);
      console.log('   - budget_max_usd        :', liveResult.budget_max_usd);
      console.log('   - lead_score            :', liveResult.lead_score);
      console.log('   - recommended_action    :', liveResult.recommended_action);
    } catch (err) {
      console.warn(`⚠️ Live Gemini check warning: ${err.message}`);
    }
  }

  if (fp > 0 || fn > 0) {
    console.error(`\n❌ Test suite failed with ${fp} false positives and ${fn} false negatives.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 30 QUALIFICATION TEST CASES PASSED WITH 100% PRECISION & RECALL!\n');
    process.exit(0);
  }
}

// Execute tests if run directly
if (process.argv[1] && process.argv[1].endsWith('qualification.test.js')) {
  runQualificationTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}
/**
 * Subreddit targets and keyword configurations for Reddit lead discovery.
 * Prioritizes high-intent client hiring subreddits, founder communities, and problem-oriented phrases.
 * Curates 205 active communities across mobile, web, backend, automation, and AI.
 */

export const SUBREDDITS = [
  // --- 1. General Freelance & Tech Hiring Boards (32) ---
  'forhire',
  'freelance_forhire',
  'jobbit',
  'Hiring',
  'remotework',
  'RemoteJobs',
  'freelance',
  'Freelancers',
  'DoneDirtCheap',
  'slavelabour',
  'techjobs',
  'Jobs4Bitcoins',
  'telecommute',
  'WorkOnline',
  'digitalnomad',
  'remotejs',
  'remote_jobs',
  'devjobs',
  'developersIndia',
  'UKJobs',
  'freelanceuk',
  'Jobopenings',
  'GigEconomy',
  'Bounties',
  'bounty_hunters',
  'freelancedevelopers',
  'ContractDevs',
  'hireaprogrammer',
  'WebDevJobs',
  'AppJobs',
  'CryptoJobsList',
  'techcareergrowth',

  // --- 2. Startup, Founder, IndieHackers & Micro-SaaS Hubs (50) ---
  'Entrepreneur',
  'startups',
  'SideProject',
  'SaaS',
  'smallbusiness',
  'EntrepreneurRideAlong',
  'MicroSaaS',
  'IndieHackers',
  'growmybusiness',
  'roastmystartup',
  'ecommerce',
  'Shopify',
  'dropship',
  'cofounder',
  'CoFounders',
  'business',
  'smallbiz',
  'sweatystartup',
  'Startup_Ideas',
  'alphaandbetausers',
  'ladybusiness',
  'ShopifyDev',
  'WooCommerce',
  'BigCommerce',
  'agency',
  'digital_marketing',
  'marketing',
  'growthhacking',
  'content_marketing',
  'affiliatemarketing',
  'AppEngine',
  'LaunchThis',
  'IMadeThis',
  'techstartups',
  'ycombinator',
  'buildinpublic',
  'juststart',
  'earlystage',
  'founders',
  'BootstrappedSaaS',
  'saasbuilders',
  'ProductHunters',
  'ProductHunt',
  'Solopreneur',
  'indiebiz',
  'nocode',
  'Bubbleio',
  'flutterflow',
  'nocoders',
  'startups_growth',

  // --- 3. Mobile App Development & Cross-Platform (32) ---
  'AppDevelopers',
  'FlutterDev',
  'reactnative',
  'iOSProgramming',
  'androiddev',
  'MobileAppDevelopment',
  'SwiftUI',
  'Flutter',
  'dartlang',
  'swift',
  'kotlin',
  'AndroidStudio',
  'Xcode',
  'iOSDev',
  'flutterhelp',
  'reactnative_dev',
  'mobiledev',
  'KMP',
  'Capacitor',
  'Cordova',
  'Expo',
  'Ionic',
  'AppIdeas',
  'AppBusiness',
  'MobileDevs',
  'react_native',
  'flutter_community',
  'ReactNativeCommunity',
  'iOS_Developer',
  'androidapps',
  'mobileprogramming',
  'CrossPlatform',

  // --- 4. Web, Frontend & Full-Stack Modern Communities (42) ---
  'webdev',
  'WebDeveloperJobs',
  'reactjs',
  'nextjs',
  'Frontend',
  'javascript',
  'typescript',
  'vuejs',
  'Wordpress',
  'web_design',
  'angular',
  'sveltejs',
  'nuxt',
  'tailwind',
  'css',
  'HTML',
  'FrontendMasters',
  'ModernWeb',
  'FullStack',
  'FullStackJobs',
  'Nodejs',
  'expressjs',
  'graphql',
  'REST',
  'webmasters',
  'WordPressThemes',
  'WordpressPlugins',
  'elementor',
  'webflow',
  'framer',
  'jamstack',
  'astrojs',
  'remixrun',
  'vite',
  'webpack',
  'TailwindCSS',
  'react',
  'svelte',
  'webdevelopment',
  'fullstackdeveloper',
  'prisma',
  'trpc',

  // --- 5. Backend, APIs, Python, Cloud & Database (42) ---
  'node',
  'backend',
  'Python',
  'django',
  'FastAPI',
  'Flask',
  'automations',
  'automation',
  'webscraping',
  'devops',
  'golang',
  'rust',
  'ruby',
  'rails',
  'php',
  'laravel',
  'PHPhelp',
  'Java',
  'spring',
  'csharp',
  'dotnet',
  'sql',
  'PostgreSQL',
  'mysql',
  'mongodb',
  'redis',
  'supabase',
  'firebase',
  'aws',
  'googlecloud',
  'azure',
  'docker',
  'kubernetes',
  'serverless',
  'microservices',
  'Automate',
  'PythonJobs',
  'golangjobs',
  'rust_programming',
  'api',
  'Postman',
  'CloudComputing',

  // --- 6. Automation, Workflows, Scraping & Tools (18) ---
  'n8n',
  'zapier',
  'make',
  'airtable',
  'notion',
  'puppeteer',
  'playwright',
  'selenium',
  'Scrapy',
  'dataengineering',
  'DataEngineeringJobs',
  'sheets',
  'excel',
  'PowerBI',
  'tableau',
  'browserautomation',
  'workflowautomation',
  'GoogleAppsScript',

  // --- 7. AI, LLM Integrations & Agents (26) ---
  'OpenAI',
  'ChatGPTCoding',
  'LangChain',
  'LocalLLaMA',
  'artificial',
  'ClaudeAI',
  'MachineLearning',
  'datascience',
  'ArtificialInteligence',
  'PromptEngineering',
  'OpenAIAPIs',
  'LlamaIndex',
  'StableDiffusion',
  'computervision',
  'HuggingFace',
  'Ollama',
  'AIBuilders',
  'AICoding',
  'midjourney',
  'VectorDatabases',
  'AutoGPT',
  'CrewAI',
  'Anthropic',
  'OpenAI_Developers',
  'AIStartups',
  'Chatbots',

  // --- 8. FinTech, Web3 & Payment Integrations (18) ---
  'ethdev',
  'solidity',
  'Solana',
  'smartcontracts',
  'web3',
  'crypto_jobs',
  'stripe',
  'FinTech',
  'algotrading',
  'CryptoCurrency',
  'Bitcoin',
  'defi',
  'NFT',
  'TradingView',
  'InteractiveBrokers',
  'StripeDev',
  'PaymentGateways',
  'ethereum'
];

export const KEYWORDS = [
  'hiring a developer',
  'looking for a freelancer',
  'need a developer',
  'need developer',
  'need help building',
  'paid project',
  'contract developer',
  'freelance project',
  'agency subcontractor',
  'mvp development',
  'app development',
  'website development',
  'api integration',
  'bug fixing',
  'automation developer',
  'react developer',
  'node.js developer',
  'node developer',
  'flutter developer',
  'full-stack developer',
  'full stack developer',
  'ai application development',
  'ai integration',
  'looking for developer',
  'looking for a developer',
  'looking for dev',
  'looking for an app developer',
  'need app developer',
  'need mobile developer',
  'need software engineer',
  'need full stack developer',
  'need programmer',
  'seeking developer',
  'seeking dev',
  'hire developer',
  'hiring developer',
  'looking for flutter',
  'looking for react native',
  'looking for mobile app',
  'looking for software developer',
  'looking for engineer',
  'looking for freelancer',
  'looking for agency',
  'looking for technical partner',
  'looking for cto',
  'technical cofounder',
  'hire flutter',
  'hire react native',
  'hire app developer',
  'hire mobile developer',
  'hire software engineer',
  'developer wanted',
  'freelancer wanted',
  'agency wanted',
  'remote developer',
  'freelance developer',
  'project available',
  'contract work',
  'hourly work',
  'fixed price',
  'build app',
  'build an app',
  'build mobile app',
  'build saas',
  'build mvp',
  'need mvp',
  'paid work',
  'paid gig',
  'cofounder',
  'co-founder',
  'hiring'
];

/**
 * Intelligent filter to qualify if a Reddit post is a candidate client/buyer lead.
 * Excludes freelancer self-advertisements, unrelated employment, and noise.
 */
export function isRedditLead(title = '', body = '') {
  const t = title.toLowerCase();
  const b = body.toLowerCase();
  const text = `${t} ${b}`;

  // 1. Reject moderator, meta, and announcement posts
  if (
    t.includes('announcement') ||
    t.includes('[meta]') ||
    t.includes('rules reminder') ||
    t.includes('rules & guidelines') ||
    t.includes('karma requirements') ||
    t.includes('check-in & updates') ||
    t.includes('thankful thursday') ||
    t.includes('weekly discussion') ||
    t.includes('free tools') ||
    t.includes('free resources')
  ) {
    return false;
  }

  // 2. Reject freelancer self-promotion / sellers
  if (
    t.startsWith('[for hire]') || 
    t.startsWith('[for-hire]') || 
    t.startsWith('for hire:') ||
    t.startsWith('[forhire]') ||
    t.includes('[for hire]') ||
    t.includes('[for-hire]') ||
    t.includes('hire me') ||
    t.includes('available for freelance') ||
    t.includes('available for work') ||
    t.includes('available for hire') ||
    t.includes('my portfolio') ||
    t.includes('seeking remote developer job') ||
    t.includes('seeking junior') ||
    t.includes('seeking sde') ||
    t.includes('offering web development') ||
    t.includes('offering my services')
  ) {
    return false;
  }

  // 3. Reject unrelated non-technical jobs
  const unrelatedRoles = [
    'customer service',
    'healthcare support',
    'patient care',
    'medical assistant',
    'sales representative',
    'sales rep',
    'cold caller',
    'telemarketer',
    'recruiter',
    'data entry',
    'virtual assistant — remote',
    'video editor',
    'warehouse',
    'on-camera presenter'
  ];
  for (const role of unrelatedRoles) {
    if (t.includes(role)) {
      return false;
    }
  }

  // 4. Explicit hiring tags in gig subreddits
  if (
    t.includes('[hiring]') || 
    t.includes('[hiring/freelance]') || 
    t.includes('(hiring)') || 
    t.startsWith('hiring:') ||
    t.startsWith('hiring -') ||
    t.startsWith('hiring ')
  ) {
    return true;
  }

  // 5. Intent regex: Looking to hire or contract someone for dev/app/mvp work
  const hiringIntentRegex = /\b(looking for|need|seeking|hire|hiring|wanted|want to build|looking to build|paying|pay for|budget|contractor|subcontract|agency)\b.{0,80}\b(developer|dev|programmer|engineer|coder|freelancer|contractor|agency|someone|partner|cofounder|co-founder|cto|app|mobile|mvp|website|web app|software|scraper|script|automation|bot|integration)\b/i;
  if (hiringIntentRegex.test(t)) {
    return true;
  }

  // 6. Problem-oriented phrases
  const problemPhrases = [
    'need help building',
    'help finishing our app',
    'help with our app',
    'help with our website',
    'api integration',
    'payment gateway integration',
    'stripe integration',
    'bug fixing',
    'automation developer',
    'build mvp',
    'mvp development',
    'admin dashboard',
    'internal tool',
    'looking to hire',
    'want to hire',
    'paid project',
    'paid gig',
    'fixed price',
    'hourly rate'
  ];
  for (const phrase of problemPhrases) {
    if (text.includes(phrase)) {
      return true;
    }
  }

  // 7. General keyword check
  const matchesKeyword = KEYWORDS.some(kw => t.includes(kw));
  if (matchesKeyword) {
    return true;
  }

  // 8. Tech stack mentioned alongside hiring / project indicators
  const techRegex = /\b(react native|flutter|next\.js|nextjs|react|node\.js|nodejs|typescript|ios|android|swift|kotlin|mobile app|web app|saas|api|firebase|supabase|stripe|playwright|puppeteer)\b/i;
  const projectRegex = /\b(contract|project|budget|hourly|freelance|mvp|build|hire|hiring|seeking|needed|help with|paying)\b/i;
  if ((techRegex.test(t) || techRegex.test(text)) && projectRegex.test(text)) {
    return true;
  }

  return false;
}

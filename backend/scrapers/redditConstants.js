/**
 * Subreddit targets and keyword configurations for Reddit lead discovery.
 * Prioritizes high-intent client hiring subreddits, founder communities, and problem-oriented phrases.
 * Curates 325+ active communities across mobile, web, backend, automation, startups, and AI.
 */

export const SUBREDDITS = [
  // --- 1. General Freelance & Tech Hiring Boards (38) ---
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
  'freelance_projects',
  'forhire_freelance',
  'GigEconomyJobs',
  'FreelanceWriters',
  'TechContractors',
  'RemoteWorkSource',
  'RemoteTech',
  'RemoteDev',
  'EuropeJobs',
  'freelance_tech',
  'techgigs',
  'freelancing',
  'RemoteJobSeekers',

  // --- 2. Startup, Founder, SaaS, Indie Hackers & E-commerce (64) ---
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
  'FulfillmentByAmazon',
  'AmazonSeller',
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
  'startup',
  'Founders',
  'TechFounders',
  'EarlyStage',
  'venturecapital',
  'angelinvestors',
  'buildinpublic',
  'ProductHunt',
  'IndieDev',
  'SoloDevelopment',
  'Solopreneur',
  'micro_saas',
  'SaaSMarketing',
  'SaaS_Growth',
  'BootstrappedSaaS',
  'B2B',
  'B2BSaaS',
  'technopreneur',
  'onlinebusiness',
  'SideHustle',
  'sidehustleideas',
  'PassiveIncome',
  'ecommerce_business',
  'ShopifyEcommerce',
  'StartupGrowth',
  'YCombinator',
  'ProductManagement',
  'Crowdfunding',
  'Crowdfund',

  // --- 3. Mobile App Development & Cross-Platform (39) ---
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
  'Android_Dev',
  'flutter_dev',
  'react_native',
  'iOS_Development',
  'SwiftDevelopers',
  'KotlinDevelopers',
  'MobileAppMarketing',
  'AppDesigning',
  'HybridAppDev',
  'CrossPlatformDev',
  'MobileDesign',
  'mobileui',
  'AppleWatchDev',
  'WearOS',

  // --- 4. Web, Frontend & Modern Full-Stack (54) ---
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
  'frontend_dev',
  'javascript_dev',
  'FullStackDev',
  'coding',
  'programming',
  'SoftwareEngineering',
  'SoftwareDevelopment',
  'webdev_tutorials',
  'learnjavascript',
  'NextJS_Dev',
  'TypeScript_Dev',
  'ReactDevelopers',
  'FrontendEngineering',
  'ModernFrontend',
  'Tailwind_CSS',
  'CSS_Design',
  'WebDesignCritique',
  'JamstackDev',
  'AstroDev',

  // --- 5. Backend, APIs, Python & Cloud (49) ---
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
  'BackendDevelopment',
  'NodeJS_Hiring',
  'PythonJobs',
  'django_jobs',
  'FastAPI_Dev',
  'GoLang_Dev',
  'Rust_Dev',
  'DevOps_Jobs',
  'CloudEngineering',
  'AWS_Cloud',
  'Firebase_Dev',
  'Supabase_Dev',
  'GraphQL_Dev',
  'API_Development',

  // --- 6. Automation, Scraping, Workflows & No-Code Bridges (24) ---
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
  'WebAutomation',
  'Playwright_Dev',
  'Puppeteer_Dev',
  'Selenium_Dev',
  'n8n_io',
  'ZapierAutomation',
  'MakeAutomation',
  'AirtableAutomation',
  'DataPipelines',

  // --- 7. AI, LLM, Vision & Machine Learning Applications (32) ---
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
  'LLMDevs',
  'AIEngineering',
  'GenerativeAI',
  'AgenticAI',
  'LangChainAI',
  'OpenAI_Developers',
  'Anthropic',
  'Groq',
  'ChromaDB',
  'Pinecone',
  'AIStartups',
  'MachineLearningJobs',

  // --- 8. Crypto, Web3, FinTech & Payment Integrations (25) ---
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
  'Web3Devs',
  'Solidity_Dev',
  'SmartContractDevs',
  'CryptoDevs',
  'Stripe_Developers',
  'AlgorithmicTrading',
  'CryptoTechnology',
  'Cardano',
  'Ethereum',
  'Polygon'
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
  'need a developer',
  'looking for developer',
  'hire developer',
  'hiring developer',
  'hire programmer',
  'hire engineer',
  'build my app',
  'build my website',
  'build an mvp'
];

/**
 * Intelligent filter to qualify if a Reddit post is a candidate client/buyer lead.
 * Excludes freelancer self-advertisements, unrelated employment, and community noise.
 * Requires genuine developer/software/web/mobile buyer intent.
 */
export function isRedditLead(title = '', body = '') {
  const t = title.toLowerCase().trim();
  const b = body.toLowerCase().trim();
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

  // 2. Reject discussion questions & advice threads about hiring
  if (
    t.startsWith('question about') ||
    t.startsWith('questions about') ||
    t.startsWith('why is hiring') ||
    t.startsWith('is hiring') ||
    t.startsWith('how to hire') ||
    t.startsWith('tips for hiring') ||
    t.startsWith('how do i') ||
    t.startsWith('what do you think') ||
    t.includes('hiring market is') ||
    t.includes('hiring process at') ||
    t.includes('my experience hiring')
  ) {
    return false;
  }

  // 3. Reject freelancer self-promotion / sellers
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
    t.includes('seeking developer role') ||
    t.includes('seeking developer job') ||
    t.includes('open to work') ||
    t.includes('open for work') ||
    t.includes('offering web development') ||
    t.includes('offering my services')
  ) {
    return false;
  }

  // 4. Reject unrelated non-technical jobs
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
    'virtual assistant (non',
    'video editor',
    'warehouse',
    'on-camera presenter',
    'guest experience leader',
    'cruise line',
    'boat',
    'yacht',
    'real estate & mortgage',
    'delivery driver',
    'nurse',
    'accountant'
  ];
  for (const role of unrelatedRoles) {
    if (t.includes(role)) {
      return false;
    }
  }

  // 5. Tech / Developer Keyword Indicators
  const devTechRegex = /\b(developer|dev|programmer|engineer|coder|fullstack|full-stack|frontend|front-end|backend|back-end|software|web|website|web app|mobile app|mobile|app|ios|android|flutter|react native|react|next\.js|nextjs|node\.js|nodejs|typescript|javascript|python|django|fastapi|api|scraping|scraper|bot|automation|firebase|supabase|stripe|mvp|saas|ui\/ux|playwright|puppeteer)\b/i;

  // 6. Explicit hiring tags with software/developer relevance
  const isExplicitHiringTag = 
    t.includes('[hiring]') || 
    t.includes('[hiring/freelance]') || 
    t.includes('(hiring)') || 
    t.startsWith('hiring:') ||
    t.startsWith('hiring -') ||
    t.startsWith('hiring ');

  if (isExplicitHiringTag) {
    // Must be tech/developer related
    if (devTechRegex.test(t) || devTechRegex.test(b.substring(0, 500))) {
      return true;
    }
    // If [hiring] tag but NO dev words in title or body, ignore non-dev job
    return false;
  }

  // 7. Intent regex: Looking to hire or contract someone for dev/app/mvp work
  const hiringIntentRegex = /\b(looking for|need|seeking|hire|hiring|wanted|want to build|looking to build|paying|pay for|budget|contractor|subcontract|agency)\b.{0,60}\b(developer|dev|programmer|engineer|coder|freelancer|contractor|partner|cofounder|co-founder|cto|app|mobile|mvp|website|web app|software|scraper|script|automation|bot|integration)\b/i;
  if (hiringIntentRegex.test(t)) {
    return true;
  }

  // 8. Problem-oriented developer phrases
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
    if (text.includes(phrase) && devTechRegex.test(text)) {
      return true;
    }
  }

  // 9. Tech stack mentioned alongside hiring / contract indicators
  const projectRegex = /\b(contract|project|budget|hourly|freelance|mvp|build|hire|hiring|seeking|needed|help with|paying)\b/i;
  if (devTechRegex.test(t) && projectRegex.test(t)) {
    return true;
  }

  return false;
}

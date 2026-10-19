/**
 * Dynamic Proposal Generator adapting across Flutter, React Native, React, Next.js,
 * Node.js, TypeScript, APIs, Firebase, Dashboards, and Automation.
 */
export function generateProposals(lead) {
  const title = lead.title || 'your development requirement';
  const budget = (lead.budget_max_usd || lead.budget_min_usd || lead.estimated_budget) 
    ? `$${(lead.budget_max_usd || lead.budget_min_usd || lead.estimated_budget).toLocaleString()}` 
    : 'your specified budget';
  const techString = lead.technology || lead.extracted_technologies || 'Full-Stack Software Development';
  const techLower = techString.toLowerCase();

  // Stack detection
  const isFlutter = techLower.includes('flutter');
  const isReactNative = techLower.includes('react native') || techLower.includes('reactnative');
  const isNextOrReact = techLower.includes('next.js') || techLower.includes('nextjs') || techLower.includes('react') || techLower.includes('frontend');
  const isBackendOrNode = techLower.includes('node') || techLower.includes('express') || techLower.includes('nest') || techLower.includes('python') || techLower.includes('django') || techLower.includes('fastapi') || techLower.includes('backend');
  const isFirebaseOrSupabase = techLower.includes('firebase') || techLower.includes('supabase');
  const isApiOrIntegration = techLower.includes('api') || techLower.includes('stripe') || techLower.includes('payment') || techLower.includes('graphql');
  const isAutomation = techLower.includes('automation') || techLower.includes('scraping') || techLower.includes('crawler') || techLower.includes('playwright');
  const isAi = techLower.includes('ai') || techLower.includes('gpt') || techLower.includes('llm') || techLower.includes('gemini');

  let domainPitch = "I'm a full-stack software developer with ~2 years of hands-on production experience building responsive apps, clean APIs, and modern dashboards.";
  if (isFlutter) {
    domainPitch = "I specialize in cross-platform mobile development with Flutter & Dart, delivering native-performance iOS & Android apps from a single clean codebase.";
  } else if (isReactNative) {
    domainPitch = "I specialize in React Native & Expo, building smooth, production-ready cross-platform mobile applications for iOS and Android.";
  } else if (isNextOrReact) {
    domainPitch = "I specialize in modern frontend engineering with React, Next.js, and TypeScript, building lightning-fast websites, dashboards, and SaaS applications.";
  } else if (isBackendOrNode) {
    domainPitch = "I specialize in robust backend architecture using Node.js, TypeScript, and modern databases, with a focus on scalable REST/GraphQL APIs and security.";
  } else if (isAutomation) {
    domainPitch = "I build resilient web scrapers, browser automation pipelines (Playwright/Puppeteer), and automated workflow integrations.";
  }

  // --- SHORT PROPOSAL ---
  const shortProposal = `Hi,

Saw your posting regarding: "${title}".

${domainPitch}

I have direct experience working with ${techString}. I write clean, maintainable code, communicate proactively, and focus on delivering business value without unnecessary delays.

${isFirebaseOrSupabase ? 'I can handle the database, authentication, and cloud setup seamlessly.' : ''}
${isApiOrIntegration ? 'I have extensive experience integrating third-party APIs and payment gateways reliably.' : ''}

I would love to have a brief chat about your scope and milestones. Let me know when you are available.

Best regards,
Aman Verma`;

  // --- MEDIUM PROPOSAL ---
  const mediumProposal = `Hi there,

I read through your project details for "${title}" and it aligns directly with my engineering background.

${domainPitch}

Here is how I would approach your requirements:
- Core Implementation: Deliver clean, modular code utilizing ${techString}, ensuring high performance, responsive design, and maintainability.
- Integrations & Architecture: ${isFirebaseOrSupabase ? 'Leverage Firebase/Supabase for rapid auth, real-time database, and serverless scalability.' : 'Implement structured REST/GraphQL APIs with robust error handling and rate-limiting.'}
${isAi ? '- AI Integrations: Integrate LLM models for structured JSON output, streaming, and custom features.' : ''}
${isAutomation ? '- Automation: Build robust error recovery, headless browser sessions, and scheduled workflows.' : ''}
- Milestones & Delivery: Break the project down into transparent weekly deliverables so you can test features continuously.

I've delivered similar technical solutions on time and within budget (${budget}). Let's connect for a brief 10-minute call to discuss your timeline and technical specifics.

Cheers,
Aman Verma`;

  // --- LONG PROPOSAL ---
  const longProposal = `Hello,

I came across your opportunity: "${title}".

${domainPitch}

I understand you're looking for someone skilled in ${techString} to take ownership of this deliverable. Here is a clear breakdown of how I can deliver this project for you:

1. Architecture & Core Build
I prioritize clean architecture, type safety, and modular state management. Whether shipping a mobile app, web dashboard, or backend integration, the codebase will be easy to extend and maintain.

2. Third-Party Integrations & Security
- Data & Auth: ${isFirebaseOrSupabase ? 'Configure authentication, role-based access control, and database rules.' : 'Implement secure API endpoints with proper input validation and JWT/session security.'}
${isApiOrIntegration ? '- Third-Party APIs: Handle webhook verification, resilient retry mechanisms, and rate limits (e.g., Stripe, external SaaS APIs).' : ''}
- Testing: Validate all critical user journeys and edge cases before release.

3. Deployment & Production Handover
I handle the end-to-end publishing and deployment process (Vercel/AWS/Cloud hosting for web, App Store & Google Play for mobile), with full documentation so your team can maintain it easily.

My estimate aligns with ${budget}, and we can establish milestone-based payments tied directly to completed features.

Are you free for a quick chat this week? I'd be happy to share relevant demos and discuss your architecture.

Best regards,
Aman Verma`;

  return {
    short: shortProposal,
    medium: mediumProposal,
    long: longProposal
  };
}

export function generateProposals(lead) {
  const title = lead.title;
  const budget = lead.estimated_budget ? `$${lead.estimated_budget.toLocaleString()}` : 'your specified budget';
  const techString = lead.technology || 'mobile app development';
  
  // Heuristic indicators
  const isFlutter = techString.toLowerCase().includes('flutter');
  const isFirebase = techString.toLowerCase().includes('firebase');
  const isApi = techString.toLowerCase().includes('api') || techString.toLowerCase().includes('node');
  const isAi = techString.toLowerCase().includes('ai') || techString.toLowerCase().includes('gpt') || techString.toLowerCase().includes('llm');

  // Experience highlights to weave in
  const experienceNotes = [];
  if (isFlutter) {
    experienceNotes.push("I build cross-platform apps using Flutter, ensuring beautiful, native-performance iOS & Android builds from a single codebase.");
  } else {
    experienceNotes.push("I specialize in cross-platform mobile development (especially Flutter), which gets your product to both App Store and Google Play twice as fast.");
  }
  
  if (isFirebase) {
    experienceNotes.push("For database and authentication, I typically use Firebase, which keeps your hosting cost near-zero at start and handles scaling seamlessly.");
  }
  
  if (isApi) {
    experienceNotes.push("I design robust REST/GraphQL APIs and server integrations (often Node.js/Express) with proper security, caching, and rate limiting.");
  }
  
  if (isAi) {
    experienceNotes.push("I've integrated LLM/AI features (OpenAI/Gemini APIs) directly into apps for structured JSON outputs, semantic search, and custom chats.");
  }

  // --- SHORT PROPOSAL ---
  const shortProposal = `Hi,

Saw your post about: "${title}". 

I'm a mobile app developer with deep experience in ${techString.toLowerCase().includes('mobile') ? techString : 'Flutter/mobile app development'}. I build high-performance, clean iOS and Android apps. 

${experienceNotes[0]}
${isFirebase ? 'I can configure Firebase for the backend/auth so we start fast.' : ''}

Would love to chat briefly and see if we're a fit. Let me know when you're free.

Best,
[Your Name]`;

  // --- MEDIUM PROPOSAL ---
  const mediumProposal = `Hi there,

I read through your request for the "${title}" project and it aligns perfectly with my background. 

I'm a senior mobile app developer. I focus on building responsive, high-performance cross-platform apps. Here's how I can help with your requirements:

- Tech Stack: I recommend using Flutter for the frontend. It allows us to ship to iOS and Android simultaneously, reducing development time and maintenance cost.
- Backend & Auth: ${isFirebase ? 'Integrating Firebase for auth, database, and notifications will keep setup simple and robust.' : 'I can integrate with your existing APIs or set up a clean, structured Node.js/Express backend.'}
${isAi ? '- AI Integration: I have experience hooking up LLM APIs for interactive client features.' : ''}

I've delivered similar apps on time and within budget. I value clear communication, clean code, and zero fluff. Let me know if you'd be open to a 10-minute call to discuss the milestones and timeline.

Cheers,
[Your Name]`;

  // --- LONG PROPOSAL ---
  const longProposal = `Hello,

I came across your post looking for a developer to build: "${title}". 

I'm a seasoned mobile engineer specializing in cross-platform applications. I understand you're looking for someone to handle ${techString}. Here is a quick breakdown of how I would approach your project:

1. Architecture & Performance
Using Flutter, I will build a highly responsive UI with smooth animations. I keep state management clean (typically Bloc or Riverpod) so the codebase remains maintainable as your features grow.

2. Backend & Third-Party Services
- Database & Auth: ${isFirebase ? 'We can leverage Firebase for rapid prototyping, real-time database synch, and secure authentication.' : 'I can build or integrate with RESTful/GraphQL APIs to ensure smooth data transport.'}
- Push Notifications: Critical for user retention; I configure APNS and FCM.

3. Testing & Deployment
I'll manage the entire release cycle—setting up TestFlight for iOS testing, Google Play Console internal testing, and guiding the app through Apple's strict review process to successful launch.

My starting estimate matches your budget (${budget}), and we can break this down into clear weekly milestones so you see progress continuously.

If you have a wireframe or a brief feature list, let's jump on a quick call. I can share some of my previous work and we can map out a realistic timeline.

Best regards,
[Your Name]
Portfolio: [Your Portfolio Link]
GitHub: [Your GitHub Link]`;

  return {
    short: shortProposal,
    medium: mediumProposal,
    long: longProposal
  };
}

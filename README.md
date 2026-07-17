# LeadHunter AI

LeadHunter AI is a complete, production-ready system that continuously scans multiple sources for mobile app development contracts, processes them using a local rule-based heuristic AI analyzer, computes priority match scores, drafts personalized pitches (short, medium, and long format), and displays opportunities on a beautiful, glassmorphic dark-themed dashboard.

## 🚀 Key Features

*   **Continuous Background Crawling**: Automatic scraping of Reddit subreddits, Hacker News hiring posts, RemoteOK API, Dev.to jobs, GitHub discussions, and Wellfound listings every 5 minutes using `node-cron`.
*   **Local Heuristic AI Evaluation**: Instantly extracts budgets, tech stacks, complexity metrics, timelines, client quality ratings, and risk warnings without paid API keys.
*   **Smart Scoring Engine**: Ranks opportunities on a scale of `0 - 100` using weighted heuristics (budget value, recency, technology relevance, urgency tags).
*   **Proposals Generator Desk**: Instantly drafts tailored freelancer proposals without sounding like generic ChatGPT templates.
*   **Status & Note Trackers**: Track application stages (`New`, `Contacted`, `Interview`, `Negotiating`, `Won`, `Lost`) and write custom opportunity notes.
*   **Desktop Alerts**: Desktop push notifications via `node-notifier` for high-score (>85) or high-budget (>$1500) leads.
*   **Universal Search & Exports**: Search leads database globally and export opportunities to `CSV` or `JSON` formats.
*   **Aesthetic Glassmorphic UI**: High-fidelity dark macOS-inspired layout with responsive Recharts widgets.

## 📂 Project Architecture

```
leadhunter-ai/
├── backend/
│   ├── controllers/      # Express controllers (leads, settings, analytics)
│   ├── routes/           # Express router endpoints
│   ├── services/         # Heuristic analyzer, proposal drafts, desktop notifier
│   ├── scrapers/         # Source crawlers (Reddit, HN, RemoteOK, others)
│   ├── database/         # SQLite initialization and schema mapping
│   ├── scheduler/        # node-cron scheduled runs
│   ├── utils/            # Colorful console logger
│   ├── server.js         # Entry server file
│   └── .env              # Backend configuration
├── frontend/
│   ├── src/
│   │   ├── components/   # Sidebar, Layout
│   │   ├── pages/        # Dashboard, Leads, Saved, Search, Analytics, Settings
│   │   ├── services/     # Frontend API connection hook
│   │   ├── index.css     # Tailwind layout & shimmers
│   │   ├── App.jsx       # App routes
│   │   └── main.jsx      # React mounting
│   ├── index.html        # HTML shell loading Inter/Outfit fonts
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── package.json          # Root scripts
└── README.md
```

## 🛠️ Installation & Setup

1.  **Clone or Open the Workspace**
    Ensure you are in the `/Users/mac/Desktop/leadhunter_ai` directory.

2.  **Install Dependencies**
    From the root folder, run:
    ```bash
    npm run install-all
    ```
    *This will install all dependencies in the root, `backend`, and `frontend` folders.*

3.  **Configure Environment**
    Confirm or edit settings in `backend/.env`. (Default values are pre-configured to run out of the box).

4.  **Run the Application**
    Start both the backend server and frontend development server concurrently by running:
    ```bash
    npm run dev
    ```

5.  **Access the Dashboard**
    Open your browser and navigate to:
    ```
    http://localhost:5173
    ```

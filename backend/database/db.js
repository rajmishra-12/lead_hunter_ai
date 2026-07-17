import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPathSetting = process.env.DB_PATH || './database/leadhunter.db';
const absoluteDbPath = path.isAbsolute(dbPathSetting) 
  ? dbPathSetting 
  : path.resolve(__dirname, '..', dbPathSetting);

// Ensure directory exists
const dbDir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

logger.info(`Initializing database at: ${absoluteDbPath}`);
const db = new Database(absoluteDbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT UNIQUE NOT NULL,
    author TEXT,
    created_time INTEGER,
    estimated_budget REAL DEFAULT 0,
    technology TEXT,
    platform TEXT,
    location TEXT,
    company TEXT,
    source TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    ai_summary TEXT,
    ai_risks TEXT,
    ai_estimated_hours INTEGER DEFAULT 0,
    ai_suggested_tech TEXT,
    status TEXT DEFAULT 'New',
    notes TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS saved (
    lead_id TEXT PRIMARY KEY,
    saved_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scraper_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    source TEXT NOT NULL,
    leads_found INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    error_message TEXT
  );
`);

// Insert default settings if they do not exist
const defaultSettings = {
  sources: 'reddit,hn,devto,remoteok,github,wellfound',
  keywords: 'Flutter,React Native,iOS,Android,Mobile App,App Developer,Need Developer,Looking For Developer,MVP,Startup,Firebase,Node.js,API,AI App,SaaS,Cross Platform',
  enableDesktopNotifications: 'true',
  minScoreNotification: '85',
  minBudgetNotification: '1500',
  theme: 'dark',
  autoRefreshInterval: '5'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
const transaction = db.transaction((settingsObj) => {
  for (const [key, val] of Object.entries(settingsObj)) {
    insertSetting.run(key, val);
  }
});

transaction(defaultSettings);

logger.success('Database initialized successfully.');

export default db;

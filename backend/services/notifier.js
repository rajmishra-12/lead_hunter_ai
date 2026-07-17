import notifier from 'node-notifier';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import db from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function sendDesktopNotification(lead) {
  try {
    // Fetch notifications settings from database
    const notifySetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('enableDesktopNotifications');
    const minScoreSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('minScoreNotification');
    const minBudgetSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('minBudgetNotification');

    const enableNotifications = notifySetting ? notifySetting.value === 'true' : true;
    const minScore = minScoreSetting ? parseInt(minScoreSetting.value, 10) : 85;
    const minBudget = minBudgetSetting ? parseFloat(minBudgetSetting.value) : 1500;

    if (!enableNotifications) {
      logger.info('Desktop notifications are disabled in settings.');
      return;
    }

    const matchesScore = lead.score >= minScore;
    const matchesBudget = lead.estimated_budget >= minBudget;

    if (matchesScore || matchesBudget) {
      logger.info(`Sending desktop notification for lead: ${lead.title} (Score: ${lead.score}, Budget: $${lead.estimated_budget})`);
      
      notifier.notify({
        title: `🔥 High Priority Lead: Score ${lead.score}`,
        message: `${lead.company || 'Client'} - $${lead.estimated_budget.toLocaleString() || 'N/A'}\n${lead.title.substring(0, 50)}...`,
        sound: true, // Play system notification sound
        wait: false
      });
    }
  } catch (err) {
    logger.error(`Failed to send desktop notification: ${err.message}`);
  }
}

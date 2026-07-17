import db from '../database/db.js';
import { logger } from '../utils/logger.js';

export const getSettings = (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settingsMap = {};
    rows.forEach(row => {
      settingsMap[row.key] = row.value;
    });

    res.json({
      success: true,
      settings: settingsMap
    });
  } catch (err) {
    logger.error(`Error in getSettings: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error fetching settings' });
  }
};

export const updateSettings = (req, res) => {
  try {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    const transaction = db.transaction((settingsObj) => {
      for (const [key, val] of Object.entries(settingsObj)) {
        // Stringify values if they are booleans/objects
        const stringVal = typeof val === 'string' ? val : String(val);
        stmt.run(key, stringVal);
      }
    });

    transaction(settings);
    logger.success('Settings updated successfully.');
    
    // Fetch and return the updated set of settings
    const updatedRows = db.prepare('SELECT key, value FROM settings').all();
    const settingsMap = {};
    updatedRows.forEach(row => {
      settingsMap[row.key] = row.value;
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: settingsMap
    });
  } catch (err) {
    logger.error(`Error in updateSettings: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error updating settings' });
  }
};

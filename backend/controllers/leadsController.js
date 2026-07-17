import db from '../database/db.js';
import { generateProposals } from '../services/proposal.js';
import { runScrapers } from '../scrapers/scraperManager.js';
import { logger } from '../utils/logger.js';

export const getLeads = (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      search = '', 
      source = '', 
      technology = '', 
      urgency = '', 
      minBudget = 0,
      status = '',
      sortBy = 'created_time',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    let queryStr = `
      SELECT l.*, 
             CASE WHEN s.lead_id IS NOT NULL THEN 1 ELSE 0 END as is_saved
      FROM leads l
      LEFT JOIN saved s ON l.id = s.lead_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      queryStr += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.company LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (source) {
      queryStr += ` AND l.source LIKE ?`;
      params.push(`%${source}%`);
    }

    if (technology) {
      queryStr += ` AND l.technology LIKE ?`;
      params.push(`%${technology}%`);
    }

    if (urgency) {
      queryStr += ` AND l.urgency = ?`;
      params.push(urgency);
    }

    if (minBudget && parseFloat(minBudget) > 0) {
      queryStr += ` AND l.estimated_budget >= ?`;
      params.push(parseFloat(minBudget));
    }

    if (status) {
      queryStr += ` AND l.status = ?`;
      params.push(status);
    }

    // Sorting
    const validSortFields = ['created_time', 'estimated_budget', 'score', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_time';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryStr += ` ORDER BY l.${sortField} ${direction}`;

    // Get Total Count for Pagination
    let countQueryStr = `SELECT COUNT(*) as count FROM (${queryStr})`;
    const totalRow = db.prepare(countQueryStr).get(...params);
    const total = totalRow ? totalRow.count : 0;

    // Apply Pagination
    queryStr += ` LIMIT ? OFFSET ?`;
    params.push(parsedLimit, offset);

    const leads = db.prepare(queryStr).all(...params);

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      leads
    });
  } catch (err) {
    logger.error(`Error in getLeads: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error fetching leads' });
  }
};

export const getLeadById = (req, res) => {
  try {
    const { id } = req.params;
    const lead = db.prepare(`
      SELECT l.*, CASE WHEN s.lead_id IS NOT NULL THEN 1 ELSE 0 END as is_saved
      FROM leads l
      LEFT JOIN saved s ON l.id = s.lead_id
      WHERE l.id = ?
    `).get(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Generate personalized proposal
    const proposals = generateProposals(lead);

    res.json({
      success: true,
      lead,
      proposals
    });
  } catch (err) {
    logger.error(`Error in getLeadById: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateLeadStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['New', 'Contacted', 'Interview', 'Negotiating', 'Won', 'Lost'];
    
    let updateFields = [];
    const params = [];

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid lead status' });
      }
      updateFields.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      params.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);
    const stmt = db.prepare(`UPDATE leads SET ${updateFields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead updated successfully' });
  } catch (err) {
    logger.error(`Error in updateLeadStatus: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const saveLead = (req, res) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, message: 'leadId is required' });
    }

    const leadExists = db.prepare('SELECT id FROM leads WHERE id = ?').get(leadId);
    if (!leadExists) {
      return res.status(404).json({ success: false, message: 'Lead does not exist' });
    }

    db.prepare('INSERT OR IGNORE INTO saved (lead_id) VALUES (?)').run(leadId);
    res.json({ success: true, message: 'Lead bookmarked successfully' });
  } catch (err) {
    logger.error(`Error in saveLead: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const unsaveLead = (req, res) => {
  try {
    const { leadId } = req.body || req.query;
    if (!leadId) {
      return res.status(400).json({ success: false, message: 'leadId is required' });
    }

    db.prepare('DELETE FROM saved WHERE lead_id = ?').run(leadId);
    res.json({ success: true, message: 'Lead removed from bookmarks' });
  } catch (err) {
    logger.error(`Error in unsaveLead: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const triggerScraping = async (req, res) => {
  try {
    const addedCount = await runScrapers();
    res.json({
      success: true,
      message: `Scraping cycle executed successfully. Added ${addedCount} new leads.`
    });
  } catch (err) {
    logger.error(`Error triggering scrapers manually: ${err.message}`);
    res.status(500).json({ success: false, message: 'Scraping failed' });
  }
};

export const getSavedLeads = (req, res) => {
  try {
    const query = `
      SELECT l.*, 1 as is_saved
      FROM leads l
      JOIN saved s ON l.id = s.lead_id
      ORDER BY s.saved_at DESC
    `;
    const leads = db.prepare(query).all();
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// EXPORT TO CSV
export const exportCSV = (req, res) => {
  try {
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_time DESC').all();
    let csv = 'ID,Title,Company,Source,Budget,Score,Status,URL,Created Time\n';
    
    for (const lead of leads) {
      const cleanTitle = (lead.title || '').replace(/"/g, '""');
      const cleanCompany = (lead.company || '').replace(/"/g, '""');
      csv += `"${lead.id}","${cleanTitle}","${cleanCompany}","${lead.source}",${lead.estimated_budget || 0},${lead.score || 0},"${lead.status}","${lead.url}",${lead.created_time}\n`;
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leadhunter_leads.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

// EXPORT TO JSON
export const exportJSON = (req, res) => {
  try {
    const leads = db.prepare('SELECT * FROM leads ORDER BY created_time DESC').all();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=leadhunter_leads.json');
    res.status(200).send(JSON.stringify(leads, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

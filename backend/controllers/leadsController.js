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
      sortOrder = 'DESC',
      showDiscussions = 'false',
      view = '', // 'high_priority', 'budget_unknown', 'agency', 'manual_review', 'rejected', 'all'
      tab = '',
      timeframe = '', // '24h', '3d', '7d', 'all'
      budgetFilter = '', // '1000+', 'confirmed', 'unknown', 'below_1000'
      clientType = '', // 'direct_client', 'agency'
      minScore = 0
    } = req.query;

    const selectedView = view || tab || '';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);
    const nowEpoch = Math.floor(Date.now() / 1000);

    let queryStr = `
      SELECT l.*, 
             CASE WHEN s.lead_id IS NOT NULL THEN 1 ELSE 0 END as is_saved
      FROM leads l
      LEFT JOIN saved s ON l.id = s.lead_id
      WHERE 1=1
    `;
    const params = [];

    // 1. View / Tab Segmentation
    if (selectedView === 'high_priority') {
      queryStr += ` AND (l.qualification_category = 'high_priority' OR (l.score >= 75 AND l.is_potential_client = 1 AND (l.budget_status = 'confirmed' OR l.estimated_budget >= 1000))) AND l.qualification_category != 'rejected' AND l.score >= 40`;
    } else if (selectedView === 'budget_unknown') {
      queryStr += ` AND (l.qualification_category = 'budget_unknown' OR (l.is_potential_client = 1 AND l.budget_status = 'unknown' AND l.score >= 60)) AND l.qualification_category != 'rejected' AND l.score >= 40`;
    } else if (selectedView === 'agency') {
      queryStr += ` AND (l.qualification_category = 'agency_contract' OR (l.is_potential_client = 1 AND (l.engagement_type = 'agency_subcontract' OR l.client_type = 'Agency'))) AND l.qualification_category != 'rejected' AND l.score >= 40`;
    } else if (selectedView === 'manual_review') {
      queryStr += ` AND (l.qualification_category = 'manual_review' OR (l.is_potential_client = 1 AND l.score BETWEEN 40 AND 74) OR l.payment_status = 'ambiguous') AND l.qualification_category != 'rejected' AND l.score >= 40`;
    } else if (selectedView === 'rejected') {
      queryStr += ` AND (l.qualification_category = 'rejected' OR l.is_potential_client = 0 OR l.score < 40 OR l.exclusion_reason IS NOT NULL)`;
    } else if (selectedView === 'all') {
      // Include all leads without category restriction
    } else {
      // Default: Exclude rejected leads from the main qualified list (must have score >= 40)
      queryStr += ` AND l.is_potential_client = 1 AND l.score >= 40 AND (l.qualification_category != 'rejected' OR l.qualification_category IS NULL)`;
    }

    // 2. Timeframe Filter (Rolling window)
    if (timeframe === '24h') {
      queryStr += ` AND l.created_time >= ?`;
      params.push(nowEpoch - 86400);
    } else if (timeframe === '3d') {
      queryStr += ` AND l.created_time >= ?`;
      params.push(nowEpoch - (3 * 86400));
    } else if (timeframe === '7d') {
      queryStr += ` AND l.created_time >= ?`;
      params.push(nowEpoch - (7 * 86400));
    } else if (timeframe === '14d') {
      queryStr += ` AND l.created_time >= ?`;
      params.push(nowEpoch - (14 * 86400));
    } else if (!timeframe && view !== 'rejected' && view !== 'all') {
      // Default rolling window for qualified opportunities
      queryStr += ` AND l.created_time >= ?`;
      params.push(nowEpoch - (7 * 86400));
    }

    // 3. Budget Status & Amount Filter
    if (budgetFilter === '1000+') {
      queryStr += ` AND (l.estimated_budget >= 1000 OR l.budget_min_usd >= 1000)`;
    } else if (budgetFilter === 'confirmed') {
      queryStr += ` AND l.budget_status = 'confirmed'`;
    } else if (budgetFilter === 'unknown') {
      queryStr += ` AND (l.budget_status = 'unknown' OR l.estimated_budget = 0)`;
    } else if (budgetFilter === 'below_1000') {
      queryStr += ` AND ((l.estimated_budget > 0 AND l.estimated_budget < 1000) OR l.budget_status = 'below_1000')`;
    }

    if (minBudget && parseFloat(minBudget) > 0) {
      queryStr += ` AND (l.estimated_budget >= ? OR l.budget_min_usd >= ?)`;
      params.push(parseFloat(minBudget), parseFloat(minBudget));
    }

    // 4. Client Type Filter
    if (clientType === 'direct_client') {
      queryStr += ` AND (l.engagement_type = 'direct_freelance' OR l.client_type != 'Agency')`;
    } else if (clientType === 'agency') {
      queryStr += ` AND (l.engagement_type = 'agency_subcontract' OR l.client_type = 'Agency')`;
    }

    // 5. Minimum Score Filter
    if (minScore && parseInt(minScore, 10) > 0) {
      queryStr += ` AND l.score >= ?`;
      params.push(parseInt(minScore, 10));
    }

    // 6. Search
    if (search) {
      queryStr += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.company LIKE ? OR l.technology LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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
      queryStr += ` AND l.urgency_level = ?`;
      params.push(urgency);
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

    // Compute active counts for tabs
    const highPriorityCount = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE (qualification_category = 'high_priority' OR (score >= 75 AND is_potential_client = 1 AND (budget_status = 'confirmed' OR estimated_budget >= 1000))) AND qualification_category != 'rejected' AND score >= 40`).get().count;
    const budgetUnknownCount = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE (qualification_category = 'budget_unknown' OR (is_potential_client = 1 AND budget_status = 'unknown' AND score >= 60)) AND qualification_category != 'rejected' AND score >= 40`).get().count;
    const agencyCount = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE (qualification_category = 'agency_contract' OR (is_potential_client = 1 AND (engagement_type = 'agency_subcontract' OR client_type = 'Agency'))) AND qualification_category != 'rejected' AND score >= 40`).get().count;
    const manualReviewCount = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE (qualification_category = 'manual_review' OR (is_potential_client = 1 AND score BETWEEN 40 AND 74) OR payment_status = 'ambiguous') AND qualification_category != 'rejected' AND score >= 40`).get().count;
    const rejectedCount = db.prepare(`SELECT COUNT(*) as count FROM leads WHERE qualification_category = 'rejected' OR is_potential_client = 0 OR score < 40 OR exclusion_reason IS NOT NULL`).get().count;

    res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      tabCounts: {
        highPriority: highPriorityCount,
        budgetUnknown: budgetUnknownCount,
        agency: agencyCount,
        manualReview: manualReviewCount,
        rejected: rejectedCount
      },
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
    let csv = 'ID,Title,Company,Source,Budget,Score,Status,URL,Created Time,Category\n';
    
    for (const lead of leads) {
      const cleanTitle = (lead.title || '').replace(/"/g, '""');
      const cleanCompany = (lead.company || '').replace(/"/g, '""');
      csv += `"${lead.id}","${cleanTitle}","${cleanCompany}","${lead.source}",${lead.estimated_budget || 0},${lead.score || 0},"${lead.status}","${lead.url}",${lead.created_time},"${lead.qualification_category || 'general'}"\n`;
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

// DELETE ALL LEADS
export const clearLeads = (req, res) => {
  try {
    db.prepare('DELETE FROM leads').run();
    db.prepare('DELETE FROM saved').run();
    logger.info('All leads cleared from the database.');
    res.json({ success: true, message: 'All leads successfully deleted.' });
  } catch (err) {
    logger.error(`Error in clearLeads: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete leads' });
  }
};

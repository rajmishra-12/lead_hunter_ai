import db from '../database/db.js';
import { logger } from '../utils/logger.js';

export const getAnalytics = (req, res) => {
  try {
    const nowEpoch = Math.floor(Date.now() / 1000);
    const oneDayAgo = nowEpoch - 86400; // 24 hours

    // 1. KPI Metrics
    const totalLeadsRow = db.prepare('SELECT COUNT(*) as count FROM leads').get();
    const totalLeads = totalLeadsRow ? totalLeadsRow.count : 0;

    const todaysLeadsRow = db.prepare('SELECT COUNT(*) as count FROM leads WHERE created_time >= ?').get(oneDayAgo);
    const todaysLeads = todaysLeadsRow ? todaysLeadsRow.count : 0;

    const highPriorityRow = db.prepare('SELECT COUNT(*) as count FROM leads WHERE score >= 80').get();
    const highPriorityLeads = highPriorityRow ? highPriorityRow.count : 0;

    const avgBudgetRow = db.prepare('SELECT AVG(estimated_budget) as avg FROM leads WHERE estimated_budget > 0').get();
    const avgBudget = avgBudgetRow && avgBudgetRow.avg ? Math.round(avgBudgetRow.avg) : 0;

    const avgScoreRow = db.prepare('SELECT AVG(score) as avg FROM leads').get();
    const avgScore = avgScoreRow && avgScoreRow.avg ? Math.round(avgScoreRow.avg) : 0;

    const todaysClientsRow = db.prepare('SELECT COUNT(DISTINCT company) as count FROM leads WHERE created_time >= ?').get(oneDayAgo);
    const todaysNewClients = todaysClientsRow ? todaysClientsRow.count : 0;

    // 2. Budget Distribution Chart
    // Brackets: <$500, $500-$1000, $1000-$2000, $2000-$5000, $5000+
    const budgets = db.prepare('SELECT estimated_budget FROM leads').all();
    const budgetDist = [
      { name: 'Under $500', value: 0 },
      { name: '$500 - $1k', value: 0 },
      { name: '$1k - $2k', value: 0 },
      { name: '$2k - $5k', value: 0 },
      { name: '$5k+', value: 0 }
    ];

    budgets.forEach(b => {
      const val = b.estimated_budget;
      if (val === 0) return;
      if (val < 500) budgetDist[0].value++;
      else if (val < 1000) budgetDist[1].value++;
      else if (val < 2000) budgetDist[2].value++;
      else if (val < 5000) budgetDist[3].value++;
      else budgetDist[4].value++;
    });

    // 3. Lead Source Chart
    const sourcesRows = db.prepare(`
      SELECT source, COUNT(*) as count 
      FROM leads 
      GROUP BY source 
      ORDER BY count DESC
    `).all();
    
    // Group subreddits together for cleaner chart representation
    const sourceSummaryMap = {};
    sourcesRows.forEach(row => {
      let key = row.source;
      if (key.startsWith('reddit/')) {
        key = 'Reddit';
      }
      sourceSummaryMap[key] = (sourceSummaryMap[key] || 0) + row.count;
    });
    const sourceData = Object.entries(sourceSummaryMap).map(([name, value]) => ({ name, value }));

    // 4. Technology Stack Chart
    const techRows = db.prepare('SELECT technology FROM leads').all();
    const techCounts = {
      'Flutter': 0,
      'React Native': 0,
      'iOS (Swift)': 0,
      'Android (Kotlin)': 0,
      'Firebase': 0,
      'Node.js': 0,
      'AI Integration': 0
    };

    techRows.forEach(row => {
      const tech = row.technology || '';
      Object.keys(techCounts).forEach(key => {
        if (tech.toLowerCase().includes(key.toLowerCase())) {
          techCounts[key]++;
        }
      });
    });
    const techData = Object.entries(techCounts).map(([name, value]) => ({ name, value }));

    // 5. Hourly Timeline Chart (last 24 hours)
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const targetTime = nowEpoch - (i * 3600);
      const targetDate = new Date(targetTime * 1000);
      const hourLabel = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const start = targetTime - 3600;
      const end = targetTime;
      const hourCountRow = db.prepare('SELECT COUNT(*) as count FROM leads WHERE created_time >= ? AND created_time < ?').get(start, end);
      
      hourlyData.push({
        time: hourLabel,
        leads: hourCountRow ? hourCountRow.count : 0
      });
    }

    // 6. Live Activity Feed (latest scraped runs & newly found leads)
    const recentHistory = db.prepare(`
      SELECT source, timestamp, leads_found, status 
      FROM scraper_history 
      ORDER BY timestamp DESC 
      LIMIT 10
    `).all();

    const recentLeads = db.prepare(`
      SELECT title, source, created_at, score, company
      FROM leads
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // 7. Intent Stats (Step 10 Analytics)
    const categoryCountsRows = db.prepare(`
      SELECT intent_category, COUNT(*) as count 
      FROM leads 
      GROUP BY intent_category
    `).all();

    const intentStats = {
      hiringLeads: 0,
      discussions: 0,
      questions: 0,
      showcases: 0,
      openSource: 0,
      falsePositives: 0,
      totalScraped: totalLeads
    };

    categoryCountsRows.forEach(row => {
      const cat = row.intent_category;
      if (['Hiring', 'Buying Services', 'Looking for Cofounder'].includes(cat)) {
        intentStats.hiringLeads += row.count;
      } else {
        intentStats.falsePositives += row.count;
        if (cat === 'Question') intentStats.questions += row.count;
        else if (cat === 'Showcase') intentStats.showcases += row.count;
        else if (cat === 'Open Source') intentStats.openSource += row.count;
        else intentStats.discussions += row.count;
      }
    });

    res.json({
      success: true,
      summary: {
        totalLeads,
        todaysLeads,
        highPriorityLeads,
        avgBudget,
        avgScore,
        todaysNewClients,
        intentStats
      },
      charts: {
        budgetDist,
        sourceData,
        techData,
        hourlyData
      },
      activityFeed: {
        history: recentHistory,
        recentLeads
      }
    });

  } catch (err) {
    logger.error(`Error generating analytics: ${err.message}`);
    res.status(500).json({ success: false, message: 'Server error generating analytics' });
  }
};

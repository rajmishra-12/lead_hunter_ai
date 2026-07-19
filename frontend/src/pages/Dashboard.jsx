import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsService, leadsService, settingsService } from '../services/api.js';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  FiDollarSign, FiUsers, FiTrendingUp, FiTarget, FiAlertCircle, FiClock 
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#f43f5e'];

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanStatus, setScanStatus] = React.useState('');
  const [scanProgress, setScanProgress] = React.useState(0);
  const [scanError, setScanError] = React.useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
  const settings = settingsData?.settings || {};

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsService.getAnalytics
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', { limit: 5 }],
    queryFn: () => leadsService.getLeads({ limit: 5 })
  });

  const handleScan = React.useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Starting scan...');
    setScanError('');
    window.dispatchEvent(new CustomEvent('dashboard-scan-start'));

    try {
      await leadsService.triggerScanStream((chunk) => {
        if (chunk.phase) {
          setScanStatus(chunk.message);
          setScanProgress(chunk.progress);
        }
        if (chunk.phase === 'error') {
          setScanError(chunk.message);
        }
        if (chunk.phase === 'refreshing') {
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          queryClient.invalidateQueries({ queryKey: ['settings'] });
        }
      });
    } catch (err) {
      console.error('Scan execution error:', err);
      setScanError(`Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
      window.dispatchEvent(new CustomEvent('dashboard-scan-end'));
    }
  }, [queryClient]);

  React.useEffect(() => {
    const handleTriggerScan = () => {
      if (!isScanning) {
        handleScan();
      }
    };
    window.addEventListener('trigger-dashboard-scan', handleTriggerScan);
    return () => {
      window.removeEventListener('trigger-dashboard-scan', handleTriggerScan);
    };
  }, [isScanning, handleScan]);

  if (analyticsLoading || leadsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-dark-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-dark-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-dark-800 rounded-2xl animate-pulse" />
          <div className="h-80 bg-dark-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const { summary, charts, activityFeed } = analyticsData || {};
  const recentLeads = leadsData?.leads || [];

  const kpis = [
    { label: 'Total Leads', val: summary?.totalLeads, icon: FiTarget, color: 'text-violet-400 bg-violet-400/10' },
    { label: "Today's Leads", val: summary?.todaysLeads, icon: FiClock, color: 'text-sky-400 bg-sky-400/10' },
    { label: 'High Priority', val: summary?.highPriorityLeads, icon: FiTrendingUp, color: 'text-emerald-400 bg-emerald-400/10' },
    { label: 'Avg Budget', val: `$${summary?.avgBudget?.toLocaleString()}`, icon: FiDollarSign, color: 'text-amber-400 bg-amber-400/10' },
    { label: 'Avg Score', val: `${summary?.avgScore}/100`, icon: FiAlertCircle, color: 'text-rose-400 bg-rose-400/10' },
    { label: 'Today Clients', val: summary?.todaysNewClients, icon: FiUsers, color: 'text-pink-400 bg-pink-400/10' }
  ];

  return (
    <div className="space-y-8">
      {/* Title & Scan Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white font-sans tracking-tight">Home Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Real-time freelance market updates and lead optimization.</p>
        </div>
        <div>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center gap-2 ${
              isScanning
                ? 'bg-violet-600/30 border border-violet-500/20 text-violet-400 cursor-not-allowed'
                : 'bg-brand-accent hover:bg-violet-600 text-white hover:shadow-violet-600/20 active:scale-95'
            }`}
          >
            {isScanning ? (
              <>
                <svg className="animate-spin h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scanning...
              </>
            ) : (
              'Scan Now'
            )}
          </button>
        </div>
      </div>

      {/* Scanning Progress & Errors */}
      {(isScanning || scanError) && (
        <div className={`glass-panel p-6 rounded-2xl border bg-dark-900/40 shadow-xl space-y-4 animate-fadeIn ${
          scanError ? 'border-brand-red/30 bg-brand-red/5' : 'border-violet-500/30 bg-violet-950/10 animate-pulse'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {scanError ? (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-ping" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping" />
              )}
              <span className={`text-sm font-extrabold uppercase tracking-wider ${
                scanError ? 'text-brand-red' : 'text-violet-300'
              }`}>
                {scanError || scanStatus || 'Initializing Scan...'}
              </span>
            </div>
            {scanError ? (
              <button 
                onClick={() => setScanError('')}
                className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-dark-800 border border-dark-700 hover:border-dark-600 transition-all"
              >
                Dismiss
              </button>
            ) : (
              <span className="text-xs font-bold text-violet-400">{scanProgress}%</span>
            )}
          </div>
          {!scanError && (
            <div className="w-full bg-dark-800 rounded-full h-2.5 overflow-hidden border border-dark-700">
              <div 
                className="bg-brand-gradient h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Last Scan Stats Summary */}
      {!isScanning && settings.lastScanTime && (
        <div className="glass-panel p-5 rounded-2xl border border-dark-700/60 bg-dark-900/10 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Scan Time</span>
            <span className="text-xs font-bold text-white mt-1">
              {new Date(parseInt(settings.lastScanTime, 10) * 1000).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Scanned</span>
            <span className="text-sm font-extrabold text-white mt-1">{settings.lastScanTotalScanned || 0} posts</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Qualified Gigs</span>
            <span className="text-sm font-extrabold text-emerald-400 mt-1">{settings.lastScanQualified || 0} leads</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Posts</span>
            <span className="text-sm font-extrabold text-slate-400 mt-1">{settings.lastScanFiltered || 0} posts</span>
          </div>
          <div className="flex flex-col col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Scan Duration</span>
            <span className="text-sm font-extrabold text-white mt-1">{settings.lastScanDuration || 0} seconds</span>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-panel p-5 rounded-2xl flex flex-col justify-between h-32 hover:border-dark-600 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                <div className={`p-2 rounded-xl ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight mt-3">{kpi.val}</span>
            </div>
          );
        })}
      </div>

      {/* Primary Graphs Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Timeline Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Hourly Discovery Timeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.hourlyData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tech Stack Distribution */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Technology Stack Focus</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.techData}>
                <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {charts?.techData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Graphs & Activity Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Budget Distribution */}
        <div className="glass-panel p-6 rounded-2xl xl:col-span-1">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Budget Brackets</h3>
          <div className="h-60 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.budgetDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts?.budgetDist?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {charts?.budgetDist?.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-slate-400">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass-panel p-6 rounded-2xl xl:col-span-2">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Live Scraper Logs</h3>
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-2">
            {activityFeed?.history?.map((log, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-dark-700/40 pb-2.5 last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${log.status === 'SUCCESS' ? 'bg-brand-green' : 'bg-brand-red'}`} />
                  <div>
                    <p className="text-xs font-semibold text-white">Scraped Source: <span className="text-brand-accent">{log.source}</span></p>
                    <p className="text-[10px] text-slate-500">{new Date(log.timestamp * 1000).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-300">Found {log.leads_found} leads</span>
                  <p className="text-[10px] text-slate-500">{log.status}</p>
                </div>
              </div>
            ))}
            {activityFeed?.history?.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-8">No scraper executions logged yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Opportunities */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">Recent High-Value Gigs</h3>
          <Link to="/leads" className="text-xs text-brand-accent hover:underline font-semibold">View all leads →</Link>
        </div>
        
        <div className="space-y-4">
          {recentLeads.map((lead) => {
            let scoreColor = 'bg-brand-green/10 text-brand-green border-brand-green/20';
            if (lead.score < 60) scoreColor = 'bg-brand-red/10 text-brand-red border-brand-red/20';
            else if (lead.score < 80) scoreColor = 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20';

            return (
              <div key={lead.id} className="p-4 rounded-xl border border-dark-700 bg-dark-900/40 hover:border-dark-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${scoreColor} font-bold`}>Score {lead.score}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{lead.source}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1.5 hover:text-brand-accent transition-all">
                    <Link to={`/leads?activeId=${lead.id}`}>{lead.title}</Link>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-4xl line-clamp-1">{lead.description}</p>
                </div>
                <div className="flex items-center gap-6 justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-semibold">Budget</span>
                    <span className="text-sm font-extrabold text-white">${lead.estimated_budget?.toLocaleString() || 'Flexible'}</span>
                  </div>
                  <Link 
                    to={`/leads?activeId=${lead.id}`}
                    className="px-4 py-2 border border-dark-700 bg-dark-800 hover:bg-brand-accent hover:border-brand-accent text-white text-xs font-semibold rounded-xl transition-all"
                  >
                    Details
                  </Link>
                </div>
              </div>
            );
          })}
          {recentLeads.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-8">No leads discovered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

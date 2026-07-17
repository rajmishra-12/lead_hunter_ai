import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService, leadsService } from '../services/api.js';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { FiDownload, FiInfo, FiTrendingUp, FiCheckCircle } from 'react-icons/fi';

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#f43f5e'];

const Analytics = () => {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: analyticsService.getAnalytics
  });

  const handleExportCsv = () => {
    window.open(leadsService.getExportCsvUrl(), '_blank');
  };

  const handleExportJson = () => {
    window.open(leadsService.getExportJsonUrl(), '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-dark-800 rounded" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-dark-800 rounded-xl" />
          <div className="h-64 bg-dark-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const { charts } = analyticsData || {};

  return (
    <div className="space-y-8">
      {/* Title & Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Analytics & Export</h2>
          <p className="text-slate-400 text-xs mt-1">Aggregated analysis, platform trends, and database exporting operations.</p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 border border-dark-700 bg-dark-900 hover:bg-dark-800 text-white font-semibold text-xs px-4.5 py-2.5 rounded-xl transition-all"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 border border-dark-700 bg-dark-900 hover:bg-dark-800 text-white font-semibold text-xs px-4.5 py-2.5 rounded-xl transition-all"
          >
            <FiDownload className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Source comparison */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Lead Discovery by Source</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.sourceData}>
                <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {charts?.sourceData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Area chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Lead Discovery Timeline (Last 24 Hours)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.hourlyData}>
                <defs>
                  <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHourly)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tech distribution */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Tech Stack Focus</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.techData} layout="vertical">
                <XAxis type="number" stroke="#4b5563" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#4b5563" fontSize={10} tickLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {charts?.techData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Brackets */}
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Budget Value Breakdown</h3>
          <div className="h-64 flex items-center justify-center">
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
                  label
                >
                  {charts?.budgetDist?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Intent Category Breakdown (Step 10 Analytics) */}
      {analyticsData?.summary?.intentStats && (
        <div className="glass-panel p-6 rounded-2xl">
          <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider mb-5">Intent Classification & Scraper Filter Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Scraped</span>
              <span className="text-xl font-extrabold text-white">{analyticsData.summary.intentStats.totalScraped}</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Hiring Leads</span>
              <span className="text-xl font-extrabold text-emerald-400">{analyticsData.summary.intentStats.hiringLeads}</span>
            </div>
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] font-bold text-rose-400 uppercase block mb-1">Filtered Out</span>
              <span className="text-xl font-extrabold text-rose-400">{analyticsData.summary.intentStats.falsePositives}</span>
            </div>
            <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Discussions</span>
              <span className="text-xl font-extrabold text-slate-300">{analyticsData.summary.intentStats.discussions}</span>
            </div>
            <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Questions</span>
              <span className="text-xl font-extrabold text-slate-300">{analyticsData.summary.intentStats.questions}</span>
            </div>
            <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Showcases</span>
              <span className="text-xl font-extrabold text-slate-300">{analyticsData.summary.intentStats.showcases}</span>
            </div>
            <div className="p-4 rounded-xl bg-dark-900/60 border border-dark-700/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Open Source</span>
              <span className="text-xl font-extrabold text-slate-300">{analyticsData.summary.intentStats.openSource}</span>
            </div>
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] font-bold text-rose-400 block mb-1 uppercase">False Positives</span>
              <span className="text-xl font-extrabold text-rose-400">{analyticsData.summary.intentStats.falsePositives}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info Warning */}
      <div className="p-4 bg-dark-900/50 rounded-xl border border-dark-700/60 flex items-start gap-3">
        <FiInfo className="w-5 h-5 text-brand-accent mt-0.5 shrink-0" />
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Scraper performance disclaimer</h4>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            All metric evaluations, budget parsers, and technology focus points are updated on every scraper cycle. Historical graphs reflect local timeline trends. Feel free to export the raw SQLite records using the CSV or JSON buttons above for further data modeling.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

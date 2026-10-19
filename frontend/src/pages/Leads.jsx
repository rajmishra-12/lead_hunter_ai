import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { leadsService } from '../services/api.js';
import { 
  FiSearch, FiFilter, FiBookmark, FiExternalLink, FiCopy, FiCheck, 
  FiFileText, FiClock, FiDollarSign, FiChevronRight, FiBriefcase,
  FiAlertCircle, FiCheckCircle, FiShield, FiTag, FiZap, FiUserCheck
} from 'react-icons/fi';

const Leads = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeIdParam = searchParams.get('activeId');

  // Active View Tab: 'high_priority', 'budget_unknown', 'agency', 'manual_review', 'rejected'
  const [activeTab, setActiveTab] = useState('high_priority');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('7d'); // Default rolling 7-day window
  const [budgetFilter, setBudgetFilter] = useState(''); // '1000+', 'confirmed', 'unknown', 'below_1000'
  const [clientTypeFilter, setClientTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('score');

  // Active Lead Details state
  const [activeLeadId, setActiveLeadId] = useState(activeIdParam || null);
  const [activeProposalTab, setActiveProposalTab] = useState('medium'); // 'short', 'medium', 'long'
  const [notesText, setNotesText] = useState('');
  const [copied, setCopied] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync active id from URL search param
  useEffect(() => {
    if (activeIdParam) {
      setActiveLeadId(activeIdParam);
    }
  }, [activeIdParam]);

  // Query Leads with tab segmentation & filters
  const { data: leadsData, isLoading: listLoading } = useQuery({
    queryKey: ['leads', { 
      view: activeTab,
      search: debouncedSearch, 
      source: sourceFilter, 
      technology: techFilter, 
      urgency: urgencyFilter, 
      timeframe: timeframeFilter,
      budgetFilter: budgetFilter,
      clientType: clientTypeFilter,
      status: statusFilter,
      sortBy,
      limit: 100
    }],
    queryFn: () => leadsService.getLeads({
      view: activeTab,
      search: debouncedSearch,
      source: sourceFilter,
      technology: techFilter,
      urgency: urgencyFilter,
      timeframe: timeframeFilter,
      budgetFilter: budgetFilter,
      clientType: clientTypeFilter,
      status: statusFilter,
      sortBy,
      limit: 100
    })
  });

  // Query Active Lead Details (and generated proposals)
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['leadDetails', activeLeadId],
    queryFn: () => leadsService.getLeadById(activeLeadId),
    enabled: !!activeLeadId
  });

  // Sync notes when details load
  useEffect(() => {
    if (detailData?.lead) {
      setNotesText(detailData.lead.notes || '');
    }
  }, [detailData]);

  // Automatically select the first lead when list changes and none selected
  useEffect(() => {
    if (leadsData?.leads && leadsData.leads.length > 0 && !activeLeadId) {
      setActiveLeadId(leadsData.leads[0].id);
    }
  }, [leadsData, activeLeadId]);

  // Mutation: Save/Unsave Lead
  const toggleSaveMutation = useMutation({
    mutationFn: ({ id, isSaved }) => {
      return isSaved ? leadsService.unsaveLead(id) : leadsService.saveLead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadDetails', activeLeadId] });
      queryClient.invalidateQueries({ queryKey: ['savedLeads'] });
    }
  });

  // Mutation: Update status and notes
  const updateDetailsMutation = useMutation({
    mutationFn: ({ id, status, notes }) => {
      return leadsService.updateLeadStatus(id, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leadDetails', activeLeadId] });
    }
  });

  // Mutation: Clear All Leads
  const clearLeadsMutation = useMutation({
    mutationFn: () => leadsService.clearLeads(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['savedLeads'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setActiveLeadId(null);
    }
  });

  const handleClearLeads = () => {
    if (window.confirm('Are you sure you want to clear all leads from the database? This action cannot be undone.')) {
      clearLeadsMutation.mutate();
    }
  };

  const handleCopyProposal = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = (newStatus) => {
    if (activeLeadId) {
      updateDetailsMutation.mutate({ id: activeLeadId, status: newStatus });
    }
  };

  const handleSaveNotes = () => {
    if (activeLeadId) {
      updateDetailsMutation.mutate({ id: activeLeadId, notes: notesText });
    }
  };

  const leads = leadsData?.leads || [];
  const tabCounts = leadsData?.tabCounts || {
    highPriority: 0,
    budgetUnknown: 0,
    agency: 0,
    manualReview: 0,
    rejected: 0
  };
  const activeLead = detailData?.lead;
  const proposals = detailData?.proposals;

  // Format age string from timestamp
  const formatAge = (timestamp) => {
    if (!timestamp) return 'Recent';
    const nowSec = Math.floor(Date.now() / 1000);
    const postSec = timestamp > 1e11 ? Math.floor(timestamp / 1000) : Number(timestamp);
    const diffSec = nowSec - postSec;
    if (diffSec < 3600) return `${Math.max(1, Math.round(diffSec / 60))}m ago`;
    if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
    const days = Math.round(diffSec / 86400);
    return `${days}d ago`;
  };

  // Workflow Tabs Configuration
  const tabs = [
    { id: 'high_priority', label: 'High-Priority Paid ($1,000+)', count: tabCounts.highPriority, color: 'text-emerald-400 border-emerald-500' },
    { id: 'budget_unknown', label: 'Budget Unknown — Qualify', count: tabCounts.budgetUnknown, color: 'text-amber-400 border-amber-500' },
    { id: 'agency', label: 'Agency Contracts', count: tabCounts.agency, color: 'text-purple-400 border-purple-500' },
    { id: 'manual_review', label: 'Needs Manual Review', count: tabCounts.manualReview, color: 'text-sky-400 border-sky-500' },
    { id: 'rejected', label: 'Rejected / Excluded', count: tabCounts.rejected, color: 'text-rose-400 border-rose-500' }
  ];

  return (
    <div className="space-y-5 h-[calc(100vh-7rem)] flex flex-col">
      {/* Title & Action Bar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <span>Client Opportunities</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified 7-Day Window
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real clients & software agencies hiring freelance developers for paid projects worth $1,000+ USD.
          </p>
        </div>
        <button
          onClick={handleClearLeads}
          disabled={clearLeadsMutation.isPending}
          className="px-3.5 py-1.5 text-xs font-semibold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 rounded-xl transition-all disabled:opacity-50"
        >
          {clearLeadsMutation.isPending ? 'Clearing...' : 'Clear All Leads'}
        </button>
      </div>

      {/* Workflow Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-dark-700/60 pb-2 overflow-x-auto flex-shrink-0 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveLeadId(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                isActive 
                  ? 'bg-dark-800 text-white shadow-sm border-brand-accent/50'
                  : 'bg-dark-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-dark-800/60'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-brand-accent/20 text-brand-accent' : 'bg-dark-700 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters Bar */}
      <div className="bg-dark-900/60 border border-dark-700/60 p-3 rounded-2xl flex flex-wrap items-center gap-3 flex-shrink-0 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-slate-500 w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search by title, stack, deliverable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-9 text-xs py-1.5 placeholder-slate-500 rounded-xl"
          />
        </div>

        {/* Timeframe */}
        <select
          value={timeframeFilter}
          onChange={(e) => setTimeframeFilter(e.target.value)}
          className="glass-input text-xs py-1.5 cursor-pointer rounded-xl font-medium"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="3d">Last 3 Days (Recent)</option>
          <option value="7d">Last 7 Days</option>
          <option value="14d">Last 14 Days (Extended)</option>
          <option value="all">All Time</option>
        </select>

        {/* Subreddit / Community */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="glass-input text-xs py-1.5 cursor-pointer rounded-xl font-medium text-slate-300"
        >
          <option value="">All Reddit Groups</option>
          <option value="forhire">r/forhire</option>
          <option value="Hiring">r/Hiring</option>
          <option value="jobbit">r/jobbit</option>
          <option value="freelance_forhire">r/freelance_forhire</option>
          <option value="AppDevelopers">r/AppDevelopers</option>
          <option value="FlutterDev">r/FlutterDev</option>
          <option value="reactnative">r/reactnative</option>
          <option value="webdev">r/webdev</option>
          <option value="nextjs">r/nextjs</option>
          <option value="SaaS">r/SaaS</option>
          <option value="startups">r/startups</option>
          <option value="Entrepreneur">r/Entrepreneur</option>
        </select>

        {/* Technology */}
        <select
          value={techFilter}
          onChange={(e) => setTechFilter(e.target.value)}
          className="glass-input text-xs py-1.5 cursor-pointer rounded-xl font-medium"
        >
          <option value="">All Stacks</option>
          <option value="Flutter">Flutter & Dart</option>
          <option value="React Native">React Native</option>
          <option value="Next.js">React / Next.js</option>
          <option value="Node">Node.js / Backend</option>
          <option value="TypeScript">TypeScript</option>
          <option value="Firebase">Firebase / Supabase</option>
          <option value="API">API Integration / Stripe</option>
          <option value="Python">Python / AI</option>
          <option value="Automation">Automation / Scraping</option>
        </select>

        {/* Budget Status */}
        <select
          value={budgetFilter}
          onChange={(e) => setBudgetFilter(e.target.value)}
          className="glass-input text-xs py-1.5 cursor-pointer rounded-xl font-medium"
        >
          <option value="">All Budgets</option>
          <option value="1000+">$1,000+ Target</option>
          <option value="confirmed">Confirmed Stated Budget</option>
          <option value="unknown">Budget Unknown (Qualify)</option>
          <option value="below_1000">Under $1,000</option>
        </select>

        {/* Client Type */}
        <select
          value={clientTypeFilter}
          onChange={(e) => setClientTypeFilter(e.target.value)}
          className="glass-input text-xs py-1.5 cursor-pointer rounded-xl font-medium"
        >
          <option value="">All Client Types</option>
          <option value="direct_client">Direct Client / Founder</option>
          <option value="agency">Agency Subcontract</option>
        </select>

        {/* Urgency */}
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="glass-input text-xs py-1.5 cursor-pointer rounded-xl font-medium"
        >
          <option value="">All Urgency</option>
          <option value="High">High Urgency</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="glass-input text-xs py-1.5 cursor-pointer rounded-xl font-medium"
        >
          <option value="score">Highest Match Score</option>
          <option value="created_time">Newest Post</option>
          <option value="estimated_budget">Highest Budget</option>
        </select>
      </div>

      {/* Main Split Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left Side: Qualified Leads List */}
        <div className="w-1/2 flex flex-col overflow-y-auto pr-1.5 space-y-3">
          {listLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-dark-800 rounded-2xl animate-pulse" />
            ))
          ) : leads.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
              <FiBriefcase className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-slate-300 text-sm font-bold">No opportunities in this category match your filters.</p>
              <p className="text-slate-500 text-xs">Try switching tabs or resetting the filter criteria.</p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSourceFilter('');
                  setTechFilter('');
                  setUrgencyFilter('');
                  setTimeframeFilter('7d');
                  setBudgetFilter('');
                  setClientTypeFilter('');
                }}
                className="text-xs text-brand-accent hover:underline font-semibold mt-2"
              >
                Reset filters
              </button>
            </div>
          ) : (
            leads.map((lead) => {
              const isActive = lead.id === activeLeadId;
              
              // Score color calculation
              let scoreBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              if (lead.score < 40) scoreBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              else if (lead.score < 60) scoreBadge = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
              else if (lead.score < 75) scoreBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

              // Budget label & badge styling
              const maxBudget = lead.budget_max_usd || lead.budget_min_usd || lead.estimated_budget || 0;
              let budgetDisplay = 'Budget Unknown (Qualify)';
              let budgetBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

              if (lead.budget_status === 'confirmed' || maxBudget >= 1000) {
                budgetDisplay = `$${maxBudget.toLocaleString()} (Confirmed)`;
                budgetBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold';
              } else if (maxBudget > 0 && maxBudget < 1000) {
                budgetDisplay = `$${maxBudget.toLocaleString()} (< $1,000)`;
                budgetBadge = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
              } else if (lead.payment_status === 'unpaid_or_equity') {
                budgetDisplay = 'Unpaid / Equity Only';
                budgetBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              }

              return (
                <div
                  key={lead.id}
                  onClick={() => {
                    setActiveLeadId(lead.id);
                    setSearchParams({ activeId: lead.id });
                  }}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between gap-3
                    ${isActive 
                      ? 'bg-brand-accent/15 border-brand-accent/60 shadow-glow' 
                      : 'bg-dark-900/40 border-dark-700/60 hover:border-dark-600'
                    }
                  `}
                >
                  {/* Top Bar: Badges & Score */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                      {/* Source */}
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-dark-800 text-slate-300 border border-dark-700">
                        {lead.source}
                      </span>

                      {/* Engagement Type */}
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {lead.opportunity_type === 'agency_subcontract' ? 'Agency Contract' : (lead.opportunity_type === 'paid_technical_task' ? 'Technical Task' : 'Direct Freelance')}
                      </span>

                      {/* Budget Badge */}
                      <span className={`text-[9px] px-2 py-0.5 rounded-lg border ${budgetBadge}`}>
                        {budgetDisplay}
                      </span>

                      {/* Age */}
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-lg bg-dark-800 text-slate-400 flex items-center gap-1">
                        <FiClock className="w-2.5 h-2.5" />
                        {formatAge(lead.created_time)}
                      </span>
                    </div>

                    {/* Score */}
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full border shrink-0 font-extrabold ${scoreBadge}`}>
                      Score {lead.score}
                    </span>
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className={`text-sm font-extrabold font-sans line-clamp-2 leading-snug transition-all ${isActive ? 'text-white' : 'text-slate-100'}`}>
                      {lead.title}
                    </h3>
                  </div>

                  {/* Short AI Qualification Reason */}
                  {lead.confidence_reason && (
                    <div className="bg-dark-800/60 p-2 rounded-xl text-[11px] text-slate-300 border border-dark-700/40 flex items-start gap-1.5">
                      <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{lead.confidence_reason}</span>
                    </div>
                  )}

                  {/* Exclusion reason if rejected */}
                  {lead.exclusion_reason && (
                    <div className="bg-rose-500/5 p-2 rounded-xl text-[11px] text-rose-300 border border-rose-500/20 flex items-start gap-1.5">
                      <FiAlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{lead.exclusion_reason}</span>
                    </div>
                  )}

                  {/* Bottom Meta & Action Recommendation */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-dark-700/40 pt-2.5 mt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-bold">{lead.author ? `u/${lead.author}` : 'Client'}</span>
                      {lead.technology && lead.technology !== 'None' && (
                        <span className="text-slate-500 font-normal truncate max-w-[180px]">
                          • {lead.technology}
                        </span>
                      )}
                    </div>
                    {lead.recommended_action && (
                      <span className="text-[10px] text-brand-accent font-bold truncate max-w-[200px]">
                        👉 {lead.recommended_action}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Lead details & tailored proposal generator */}
        <div className="w-1/2 bg-dark-900/45 border border-dark-700/60 rounded-2xl flex flex-col overflow-y-auto">
          {activeLeadId === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-2">
              <FiFileText className="w-10 h-10 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">Select an opportunity to view AI qualification and custom outreach proposals.</p>
            </div>
          ) : detailLoading ? (
            <div className="p-8 space-y-6 flex-1">
              <div className="h-6 w-3/4 bg-dark-800 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-dark-800 rounded animate-pulse" />
              <div className="h-32 bg-dark-800 rounded-xl animate-pulse" />
              <div className="h-28 bg-dark-800 rounded-xl animate-pulse" />
            </div>
          ) : activeLead ? (
            <div className="p-6 space-y-6 flex-1 flex flex-col">
              {/* Header */}
              <div className="space-y-3.5 border-b border-dark-700/60 pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-300 font-bold bg-dark-800 px-2.5 py-1 rounded-lg border border-dark-700">
                      {activeLead.source}
                    </span>
                    <span className="text-xs text-emerald-400 font-extrabold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Match Score: {activeLead.score}/100
                    </span>
                    <span className="text-xs text-slate-400 bg-dark-800 px-2.5 py-1 rounded-lg border border-dark-700">
                      Published: {formatAge(activeLead.created_time)}
                    </span>
                  </div>
                  <button 
                    onClick={() => toggleSaveMutation.mutate({ id: activeLead.id, isSaved: activeLead.is_saved })}
                    className={`p-2 rounded-xl border transition-all ${activeLead.is_saved ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'border-dark-700 hover:bg-dark-800 text-slate-400'}`}
                    title="Bookmark lead"
                  >
                    <FiBookmark className={`w-4.5 h-4.5 ${activeLead.is_saved ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-white leading-snug">{activeLead.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-medium">
                    <span>Author: <strong className="text-slate-200">{activeLead.author ? `u/${activeLead.author}` : 'Anonymous'}</strong></span>
                    <span>Required Tech: <strong className="text-brand-accent">{activeLead.technology || 'Full-Stack'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Status Tracker & Direct Link */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Outreach Status</label>
                  <select 
                    value={activeLead.status} 
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="glass-input w-full text-xs cursor-pointer py-1.5 rounded-xl font-semibold"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Interview">Interview</option>
                    <option value="Negotiating">Negotiating</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Original Post</label>
                  <a 
                    href={activeLead.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-brand-accent hover:bg-violet-600 text-xs font-bold px-4 py-1.5 rounded-xl text-white transition-all h-[34px] shadow-sm"
                  >
                    <span>Open on Reddit</span>
                    <FiExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* AI Semantic Intelligence Breakdown */}
              <div className="bg-dark-900/60 p-4 rounded-xl border border-dark-700/60 space-y-3">
                <div className="flex items-center justify-between border-b border-dark-700/40 pb-2">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <FiShield className="text-emerald-400" /> AI Qualification Breakdown
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    Budget: <strong className="text-emerald-400">
                      {(activeLead.budget_max_usd || activeLead.estimated_budget) ? `$${(activeLead.budget_max_usd || activeLead.estimated_budget).toLocaleString()} USD` : 'Undisclosed'}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  <div className="bg-dark-800/70 p-2 rounded-lg border border-dark-700/50">
                    <div className="text-slate-500 uppercase font-bold">Scope Clarity</div>
                    <div className="text-slate-200 font-extrabold capitalize mt-0.5">{activeLead.scope_clarity || 'Medium'}</div>
                  </div>
                  <div className="bg-dark-800/70 p-2 rounded-lg border border-dark-700/50">
                    <div className="text-slate-500 uppercase font-bold">Urgency</div>
                    <div className="text-slate-200 font-extrabold capitalize mt-0.5">{activeLead.urgency_level || 'Medium'}</div>
                  </div>
                  <div className="bg-dark-800/70 p-2 rounded-lg border border-dark-700/50">
                    <div className="text-slate-500 uppercase font-bold">Payment Status</div>
                    <div className="text-slate-200 font-extrabold capitalize mt-0.5">{activeLead.payment_status || 'Budgeted'}</div>
                  </div>
                </div>

                {activeLead.confidence_reason && (
                  <div className="text-xs text-slate-300 leading-relaxed pt-1">
                    <strong className="text-slate-400 font-semibold block text-[10px] uppercase mb-0.5">Why this qualifies:</strong>
                    {activeLead.confidence_reason}
                  </div>
                )}

                {activeLead.recommended_action && (
                  <div className="bg-brand-accent/10 border border-brand-accent/20 p-2.5 rounded-lg text-xs text-violet-300 leading-relaxed">
                    <strong className="text-violet-400 font-extrabold block text-[10px] uppercase mb-0.5">Recommended Action:</strong>
                    {activeLead.recommended_action}
                  </div>
                )}

                {activeLead.exclusion_reason && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-xs text-rose-300 leading-relaxed">
                    <strong className="text-rose-400 font-extrabold block text-[10px] uppercase mb-0.5">Disqualification Reason:</strong>
                    {activeLead.exclusion_reason}
                  </div>
                )}
              </div>

              {/* Full Description / Post Content */}
              {activeLead.description && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Posting Text</label>
                  <div className="bg-dark-900/60 p-3.5 rounded-xl border border-dark-700/60 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line font-mono text-[11px]">
                    {activeLead.description}
                  </div>
                </div>
              )}

              {/* Tailored Proposal Generator */}
              <div className="space-y-3 pt-1 border-t border-dark-700/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <FiZap className="text-amber-400" /> Tailored Outreach Pitch
                  </label>
                  <div className="flex items-center gap-1 bg-dark-800 p-0.5 rounded-lg border border-dark-700">
                    <button
                      onClick={() => setActiveProposalTab('short')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                        activeProposalTab === 'short' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Short
                    </button>
                    <button
                      onClick={() => setActiveProposalTab('medium')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                        activeProposalTab === 'medium' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => setActiveProposalTab('long')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                        activeProposalTab === 'long' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Detailed
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    rows={8}
                    value={proposals?.[activeProposalTab] || ''}
                    className="w-full bg-dark-950/80 border border-dark-700/80 rounded-xl p-3 text-xs text-slate-300 font-mono leading-relaxed resize-none focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopyProposal(proposals?.[activeProposalTab] || '')}
                    className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-dark-800/90 hover:bg-dark-700 border border-dark-600 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-md transition-all"
                  >
                    {copied ? (
                      <>
                        <FiCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <FiCopy className="w-3.5 h-3.5" />
                        <span>Copy Proposal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Private Notes */}
              <div className="space-y-2 pt-2 border-t border-dark-700/60">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Private Notes</label>
                  <button
                    onClick={handleSaveNotes}
                    className="text-xs text-brand-accent font-bold hover:underline"
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Record client responses, agreed rate, or follow-up dates..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full glass-input text-xs p-2.5 rounded-xl placeholder-slate-600"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Leads;

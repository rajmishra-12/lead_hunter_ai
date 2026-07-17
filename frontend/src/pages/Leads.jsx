import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { leadsService } from '../services/api.js';
import { 
  FiSearch, FiFilter, FiBookmark, FiExternalLink, FiCopy, FiCheck, 
  FiFileText, FiClock, FiDollarSign, FiChevronRight, FiBriefcase 
} from 'react-icons/fi';

const Leads = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeIdParam = searchParams.get('activeId');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [minBudgetFilter, setMinBudgetFilter] = useState('0');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_time');

  // Active Lead Details state
  const [activeLeadId, setActiveLeadId] = useState(activeIdParam || null);
  const [activeProposalTab, setActiveProposalTab] = useState('medium'); // 'short', 'medium', 'long'
  const [notesText, setNotesText] = useState('');
  const [copied, setCopied] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sync active id from URL search param
  useEffect(() => {
    if (activeIdParam) {
      setActiveLeadId(activeIdParam);
    }
  }, [activeIdParam]);

  // Query Leads
  const { data: leadsData, isLoading: listLoading } = useQuery({
    queryKey: ['leads', { 
      search: debouncedSearch, 
      source: sourceFilter, 
      technology: techFilter, 
      urgency: urgencyFilter, 
      minBudget: minBudgetFilter,
      status: statusFilter,
      sortBy,
      limit: 100
    }],
    queryFn: () => leadsService.getLeads({
      search: debouncedSearch,
      source: sourceFilter,
      technology: techFilter,
      urgency: urgencyFilter,
      minBudget: minBudgetFilter,
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
      setActiveLeadId(null);
    }
  });

  const handleClearLeads = () => {
    if (window.confirm('Are you sure you want to delete all leads from the database? This action cannot be undone.')) {
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
  const activeLead = detailData?.lead;
  const proposals = detailData?.proposals;

  return (
    <div className="space-y-6 h-[calc(100vh-7rem)] flex flex-col">
      {/* Title & Stats */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Freelance Opportunities</h2>
          <p className="text-slate-400 text-xs mt-1">Review opportunities, customize proposals, and track client responses.</p>
        </div>
        <button
          onClick={handleClearLeads}
          disabled={clearLeadsMutation.isPending}
          className="px-4 py-2 text-xs font-semibold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearLeadsMutation.isPending ? 'Clearing...' : 'Clear All Leads'}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-dark-900/60 border border-dark-700/60 p-4 rounded-2xl flex flex-wrap items-center gap-4 flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-slate-500 w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Filter by title, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input pl-9 text-xs py-2 placeholder-slate-500"
          />
        </div>

        {/* Source */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="glass-input text-xs py-2 cursor-pointer"
        >
          <option value="">All Sources</option>
          <option value="reddit">Reddit</option>
          <option value="Hacker News">Hacker News</option>
          <option value="RemoteOK">RemoteOK</option>
          <option value="Dev.to">Dev.to Jobs</option>
          <option value="GitHub">GitHub Discussions</option>
          <option value="Wellfound">Wellfound</option>
        </select>

        {/* Technology */}
        <select
          value={techFilter}
          onChange={(e) => setTechFilter(e.target.value)}
          className="glass-input text-xs py-2 cursor-pointer"
        >
          <option value="">All Technologies</option>
          <option value="Flutter">Flutter</option>
          <option value="React Native">React Native</option>
          <option value="iOS">iOS</option>
          <option value="Android">Android</option>
          <option value="Firebase">Firebase</option>
          <option value="Node">Node.js</option>
        </select>

        {/* Urgency */}
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="glass-input text-xs py-2 cursor-pointer"
        >
          <option value="">All Urgency</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {/* Budget */}
        <select
          value={minBudgetFilter}
          onChange={(e) => setMinBudgetFilter(e.target.value)}
          className="glass-input text-xs py-2 cursor-pointer"
        >
          <option value="0">Any Budget</option>
          <option value="500">+$500</option>
          <option value="1000">+$1,000</option>
          <option value="2000">+$2,000</option>
          <option value="5000">+$5,000</option>
        </select>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input text-xs py-2 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Interview">Interview</option>
          <option value="Negotiating">Negotiating</option>
          <option value="Won">Won</option>
          <option value="Lost">Lost</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="glass-input text-xs py-2 cursor-pointer"
        >
          <option value="created_time">Newest Post</option>
          <option value="estimated_budget">Highest Budget</option>
          <option value="score">Highest Match Score</option>
        </select>
      </div>

      {/* Main Split Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Left Side: Leads List */}
        <div className="w-1/2 flex flex-col overflow-y-auto pr-2 space-y-3.5">
          {listLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-dark-800 rounded-2xl animate-pulse" />
            ))
          ) : leads.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
              <FiBriefcase className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-slate-400 text-sm font-semibold">No opportunities match the selected criteria.</p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSourceFilter('');
                  setTechFilter('');
                  setUrgencyFilter('');
                  setMinBudgetFilter('0');
                  setStatusFilter('');
                }}
                className="text-xs text-brand-accent hover:underline font-semibold"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            leads.map((lead) => {
              const isActive = lead.id === activeLeadId;
              let scoreColor = 'bg-brand-green/10 text-brand-green border-brand-green/20';
              if (lead.score < 60) scoreColor = 'bg-brand-red/10 text-brand-red border-brand-red/20';
              else if (lead.score < 80) scoreColor = 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20';

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
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`text-sm font-extrabold font-sans line-clamp-1 transition-all ${isActive ? 'text-white' : 'text-slate-200'}`}>
                      {lead.title}
                    </h3>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border shrink-0 font-bold ${scoreColor}`}>
                      Score {lead.score}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{lead.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold border-t border-dark-700/40 pt-2.5 mt-1">
                    <div className="flex items-center gap-3">
                      <span className="text-brand-accent uppercase font-bold">{lead.source}</span>
                      <span>{lead.company || 'Client'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-300 font-extrabold">${lead.estimated_budget ? lead.estimated_budget.toLocaleString() : 'Flexible'}</span>
                      <span className="bg-dark-800 px-2 py-0.5 rounded-full text-slate-400">{lead.status}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Lead details & proposals */}
        <div className="w-1/2 bg-dark-900/45 border border-dark-700/60 rounded-2xl flex flex-col overflow-y-auto">
          {activeLeadId === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-2">
              <FiFileText className="w-10 h-10" />
              <p className="text-sm font-semibold">Select a lead to see detailed AI evaluation and generated proposals.</p>
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold bg-dark-800 px-2.5 py-1 rounded-lg border border-dark-700">
                      {activeLead.source}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold bg-dark-800 px-2.5 py-1 rounded-lg border border-dark-700">
                      Score: {activeLead.score}
                    </span>
                  </div>
                  <button 
                    onClick={() => toggleSaveMutation.mutate({ id: activeLead.id, isSaved: activeLead.is_saved })}
                    className={`p-2 rounded-xl border transition-all ${activeLead.is_saved ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'border-dark-700 hover:bg-dark-800 text-slate-400'}`}
                  >
                    <FiBookmark className={`w-4.5 h-4.5 ${activeLead.is_saved ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white leading-snug">{activeLead.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 font-medium">
                    <span>Company: <strong className="text-slate-200">{activeLead.company}</strong></span>
                    <span>Author: <strong className="text-slate-200">{activeLead.author}</strong></span>
                    <span>Time: <strong className="text-slate-200">{new Date(activeLead.created_time * 1000).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Status Tracker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Lead Status</label>
                  <select 
                    value={activeLead.status} 
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="glass-input w-full text-xs cursor-pointer py-1.5"
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Action</label>
                  <a 
                    href={activeLead.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-xs font-semibold px-4 py-1.5 rounded-lg text-white transition-all h-[34px]"
                  >
                    <span>Open Opportunity</span>
                    <FiExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* AI Details Heuristics */}
              <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                  AI Summary & Analysis
                </h4>
                
                <p className="text-xs text-slate-300 leading-relaxed bg-dark-950/60 p-3 rounded-lg border border-dark-800">{activeLead.ai_summary}</p>
                
                <div className="grid grid-cols-2 gap-3 text-xs pt-1.5">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Suggested Tech Stack</span>
                    <span className="text-slate-200 font-bold">{activeLead.ai_suggested_tech}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Estimated Effort</span>
                    <span className="text-slate-200 font-bold">{activeLead.ai_estimated_hours} hours ({activeLead.complexity})</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase">Detected Risks</span>
                    <span className="text-brand-red font-medium text-xs leading-relaxed">{activeLead.ai_risks}</span>
                  </div>
                </div>
              </div>

              {/* Original Posting Description */}
              <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Original Posting Description
                </h4>
                <div className="text-xs text-slate-400 leading-relaxed bg-dark-950/60 p-3 rounded-lg border border-dark-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {activeLead.description}
                </div>
              </div>

              {/* Extracted Links */}
              {(() => {
                const urlRegex = /(https?:\/\/[^\s\)\],]+)/g;
                const matches = activeLead.description ? activeLead.description.match(urlRegex) : null;
                const extractedUrls = matches ? [...new Set(matches)] : [];
                
                if (extractedUrls.length === 0) return null;
                
                return (
                  <div className="bg-dark-900/50 p-4 rounded-xl border border-dark-700/60 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Extracted Links & Contacts
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {extractedUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-accent hover:underline flex items-center gap-1 bg-dark-950/60 px-3 py-1.5 rounded-lg border border-dark-800"
                        >
                          <span className="truncate max-w-[200px]">{url}</span>
                          <FiExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Proposal Generator Section */}
              <div className="border-t border-dark-700/60 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">AI Proposal Drafts</h4>
                  <div className="flex bg-dark-950 rounded-lg p-0.5 border border-dark-800">
                    {['short', 'medium', 'long'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveProposalTab(tab)}
                        className={`text-[10px] font-bold px-3 py-1 rounded-md uppercase transition-all
                          ${activeProposalTab === tab 
                            ? 'bg-brand-accent text-white' 
                            : 'text-slate-500 hover:text-slate-300'
                          }
                        `}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={proposals ? proposals[activeProposalTab] : ''}
                    className="w-full bg-dark-950/80 border border-dark-800 text-xs text-slate-300 p-4 rounded-xl font-mono h-48 focus:outline-none resize-none leading-relaxed"
                  />
                  <button
                    onClick={() => handleCopyProposal(proposals ? proposals[activeProposalTab] : '')}
                    className="absolute top-3 right-3 p-2 bg-dark-800 hover:bg-brand-accent hover:text-white rounded-lg border border-dark-700 text-slate-400 transition-all"
                    title="Copy proposal"
                  >
                    {copied ? <FiCheck className="w-3.5 h-3.5 text-brand-green" /> : <FiCopy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Developer Custom Notes */}
              <div className="border-t border-dark-700/60 pt-5 space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Custom Opportunity Notes</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter custom notes or interview feedback..."
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    className="flex-1 glass-input text-xs py-1.5"
                  />
                  <button 
                    onClick={handleSaveNotes}
                    className="bg-dark-800 hover:bg-dark-700 border border-dark-700 text-white font-semibold text-xs px-4 rounded-lg active:scale-95 transition-all"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Leads;

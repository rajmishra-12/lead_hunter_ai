import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { leadsService } from '../services/api.js';
import { FiSearch, FiDollarSign, FiCalendar, FiArrowRight, FiTag } from 'react-icons/fi';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [queryText, setQueryText] = useState(initialQuery);
  const [minBudget, setMinBudget] = useState('0');
  const [source, setSource] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : ['Flutter MVP', 'iOS Developer', 'Stripe', 'React Native'];
  });

  // Keep search input synced with url params if they update from header
  useEffect(() => {
    if (initialQuery) {
      setQueryText(initialQuery);
    }
  }, [initialQuery]);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['searchLeads', { search: initialQuery, minBudget, source }],
    queryFn: () => leadsService.getLeads({ search: initialQuery, minBudget, source }),
    enabled: true
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (queryText.trim()) {
      // Save recent search
      const updated = [queryText, ...recentSearches.filter(s => s !== queryText)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      
      setSearchParams({ q: queryText });
    }
  };

  const handleRecentClick = (term) => {
    setQueryText(term);
    setSearchParams({ q: term });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const results = searchResults?.leads || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Universal Search</h2>
        <p className="text-slate-400 text-xs mt-1">Search the database using custom keywords, technology stacks, or platforms.</p>
      </div>

      {/* Main Search Bar Form */}
      <form onSubmit={handleSearch} className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-slate-500 w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Search by technology, company, platform, keyword..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              className="w-full glass-input pl-10 py-2.5 text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold text-sm px-6 rounded-xl transition-all"
          >
            Search
          </button>
        </div>

        {/* Extended Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-dark-750/30">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="glass-input w-full text-xs py-1.5 cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="reddit">Reddit</option>
              <option value="Hacker News">Hacker News</option>
              <option value="RemoteOK">RemoteOK</option>
              <option value="Dev.to">Dev.to Jobs</option>
              <option value="GitHub">GitHub Discussions</option>
              <option value="Wellfound">Wellfound</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Minimum Budget</label>
            <select
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              className="glass-input w-full text-xs py-1.5 cursor-pointer"
            >
              <option value="0">Flexible / Any</option>
              <option value="500">+$500</option>
              <option value="1500">+$1,500</option>
              <option value="3000">+$3,000</option>
              <option value="5000">+$5,000</option>
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recent Searches</label>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((term, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => handleRecentClick(term)}
                  className="bg-dark-800 hover:bg-dark-700 text-slate-300 px-2 py-0.5 rounded-md text-[10px] border border-dark-700"
                >
                  {term}
                </button>
              ))}
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={clearRecent}
                  className="text-slate-500 hover:text-slate-400 px-1 py-0.5 text-[10px] font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Results Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">
          {initialQuery ? `Search Results for "${initialQuery}" (${results.length})` : 'Enter a search term above'}
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-dark-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 && initialQuery ? (
          <p className="text-slate-500 text-xs text-center py-8">No results found matching your query.</p>
        ) : (
          results.map((lead) => {
            let scoreColor = 'bg-brand-green/10 text-brand-green border-brand-green/20';
            if (lead.score < 60) scoreColor = 'bg-brand-red/10 text-brand-red border-brand-red/20';
            else if (lead.score < 80) scoreColor = 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20';

            return (
              <div key={lead.id} className="p-4 rounded-xl border border-dark-700 bg-dark-900/40 hover:border-dark-600 transition-all flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${scoreColor} font-bold`}>Score {lead.score}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">{lead.source}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-1 hover:text-brand-accent transition-all">
                    <Link to={`/leads?activeId=${lead.id}`}>{lead.title}</Link>
                  </h4>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Budget</span>
                    <span className="text-xs font-bold text-white">${lead.estimated_budget?.toLocaleString() || 'Flexible'}</span>
                  </div>
                  <Link 
                    to={`/leads?activeId=${lead.id}`}
                    className="p-2 border border-dark-700 bg-dark-800 hover:bg-brand-accent text-white rounded-xl transition-all"
                  >
                    <FiArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Search;

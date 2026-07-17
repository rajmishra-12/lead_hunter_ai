import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsService } from '../services/api.js';
import { FiBookmark, FiExternalLink, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Saved = () => {
  const queryClient = useQueryClient();

  const { data: savedData, isLoading } = useQuery({
    queryKey: ['savedLeads'],
    queryFn: leadsService.getSavedLeads
  });

  const unsaveMutation = useMutation({
    mutationFn: leadsService.unsaveLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedLeads'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });

  const leads = savedData?.leads || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 bg-dark-800 rounded animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-dark-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Bookmarked Leads</h2>
        <p className="text-slate-400 text-xs mt-1">Quick access to opportunities you marked for later application.</p>
      </div>

      <div className="space-y-4">
        {leads.map((lead) => {
          let scoreColor = 'bg-brand-green/10 text-brand-green border-brand-green/20';
          if (lead.score < 60) scoreColor = 'bg-brand-red/10 text-brand-red border-brand-red/20';
          else if (lead.score < 80) scoreColor = 'bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20';

          return (
            <div key={lead.id} className="p-5 rounded-2xl border border-dark-700 bg-dark-900/40 hover:border-dark-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border ${scoreColor} font-bold`}>Score {lead.score}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{lead.source}</span>
                  <span className="text-[10px] bg-dark-800 text-slate-400 border border-dark-700 px-2 py-0.5 rounded-full font-bold">{lead.status}</span>
                </div>
                <h4 className="text-sm font-extrabold text-white hover:text-brand-accent transition-all">
                  <Link to={`/leads?activeId=${lead.id}`}>{lead.title}</Link>
                </h4>
                <p className="text-xs text-slate-400 line-clamp-1">{lead.description}</p>
              </div>

              <div className="flex items-center gap-6 justify-between md:justify-end">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block font-semibold">Budget</span>
                  <span className="text-sm font-extrabold text-white">${lead.estimated_budget?.toLocaleString() || 'Flexible'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => unsaveMutation.mutate(lead.id)}
                    className="p-2 border border-amber-400/20 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 rounded-xl transition-all"
                    title="Remove from saved"
                  >
                    <FiBookmark className="w-4 h-4 fill-current" />
                  </button>
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 border border-dark-700 bg-dark-800 hover:bg-dark-700 text-slate-300 rounded-xl transition-all"
                    title="Open original page"
                  >
                    <FiExternalLink className="w-4 h-4" />
                  </a>
                  <Link 
                    to={`/leads?activeId=${lead.id}`}
                    className="p-2 border border-dark-700 bg-dark-800 hover:bg-brand-accent hover:border-brand-accent text-white rounded-xl transition-all"
                    title="Go to Details"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {leads.length === 0 && (
          <div className="glass-panel p-16 rounded-2xl text-center space-y-3">
            <FiAlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-slate-400 text-sm font-semibold">No saved leads yet.</p>
            <p className="text-slate-500 text-xs">Bookmark high score jobs on the Leads list to view them here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Saved;

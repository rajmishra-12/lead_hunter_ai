import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadsService } from '../services/api.js';
import { generateProposals } from '../utils/proposal.js';
import { FiFileText, FiCopy, FiCheck, FiChevronRight } from 'react-icons/fi';

const ProposalGenerator = () => {
  const { data: savedData, isLoading } = useQuery({
    queryKey: ['savedLeads'],
    queryFn: leadsService.getSavedLeads
  });

  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedTab, setSelectedTab] = useState('medium'); // 'short', 'medium', 'long'
  const [copied, setCopied] = useState(false);

  const leads = savedData?.leads || [];
  const activeLead = leads.find(l => l.id === selectedLeadId);

  // If no lead is selected, fall back to a generic/default object to generate mock proposal templates
  const fallbackLead = {
    title: 'Custom Mobile Application Development',
    estimated_budget: 5000,
    technology: 'Flutter, Firebase, APIs, Node.js',
    platform: 'Cross-Platform Mobile'
  };

  const currentLead = activeLead || fallbackLead;
  const proposals = generateProposals(currentLead);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">Proposal Generator Tab</h2>
        <p className="text-slate-400 text-xs mt-1">Review drafts, select target opportunities, and copy personalized pitches instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left selector */}
        <div className="glass-panel p-5 rounded-2xl lg:col-span-1 space-y-4">
          <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Select Opportunity</h3>
          
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedLeadId('')}
              className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex flex-col gap-1
                ${selectedLeadId === '' 
                  ? 'bg-brand-accent/20 border-brand-accent text-white font-bold' 
                  : 'bg-dark-900/40 border-dark-700/60 text-slate-400 hover:border-dark-600'
                }
              `}
            >
              <span>Generic Pitch Template</span>
              <span className="text-[10px] text-slate-500">Default generic parameters</span>
            </button>

            {isLoading ? (
              <div className="h-10 bg-dark-800 rounded animate-pulse" />
            ) : (
              leads.map(lead => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex flex-col gap-1
                    ${selectedLeadId === lead.id 
                      ? 'bg-brand-accent/20 border-brand-accent text-white font-bold' 
                      : 'bg-dark-900/40 border-dark-700/60 text-slate-400 hover:border-dark-600'
                    }
                  `}
                >
                  <span className="line-clamp-1">{lead.title}</span>
                  <span className="text-[9px] text-slate-500 font-semibold">{lead.company || 'Client'} • {lead.source}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Preview desk */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-700/40 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Proposal Draft Desk</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Targeting: <strong className="text-brand-accent">{currentLead.title}</strong></p>
            </div>
            
            <div className="flex bg-dark-950 rounded-lg p-0.5 border border-dark-800">
              {['short', 'medium', 'long'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`text-[10px] font-bold px-3.5 py-1.5 rounded-md uppercase transition-all
                    ${selectedTab === tab 
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
              value={proposals[selectedTab]}
              className="w-full bg-dark-950 border border-dark-800 text-xs text-slate-300 p-5 rounded-xl font-mono h-80 focus:outline-none resize-none leading-relaxed"
            />
            
            <button
              onClick={() => handleCopy(proposals[selectedTab])}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
            >
              {copied ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 bg-dark-950/60 border border-dark-850 rounded-xl">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Natural alignment note</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              These proposals automatically highlight mobile development expertise (such as Flutter, Firebase APIs, LLM hooks) depending on detected job keywords. Customize names, github references, and hourly rates before sending to clients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalGenerator;

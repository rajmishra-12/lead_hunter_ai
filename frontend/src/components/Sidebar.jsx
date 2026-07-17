import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FiGrid, 
  FiList, 
  FiBookmark, 
  FiSearch, 
  FiPieChart, 
  FiFileText, 
  FiSettings 
} from 'react-icons/fi';

const Sidebar = () => {
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: FiGrid },
    { path: '/leads', label: 'Leads', icon: FiList },
    { path: '/saved', label: 'Saved', icon: FiBookmark },
    { path: '/search', label: 'Search', icon: FiSearch },
    { path: '/analytics', label: 'Analytics', icon: FiPieChart },
    { path: '/proposal-generator', label: 'Proposal Generator', icon: FiFileText },
    { path: '/settings', label: 'Settings', icon: FiSettings }
  ];

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700/60 flex flex-col h-screen fixed left-0 top-0 z-20">
      {/* Brand Logo / Header */}
      <div className="p-6 border-b border-dark-700/40 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-accent to-indigo-500 flex items-center justify-center shadow-glow">
          <span className="text-white font-extrabold text-lg font-sans">L</span>
        </div>
        <div>
          <h1 className="font-extrabold text-md tracking-wide font-sans text-white">LeadHunter AI</h1>
          <span className="text-[10px] text-brand-accent font-semibold tracking-wider uppercase">Auto Freelance Engine</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-sm
              ${isActive 
                ? 'bg-gradient-to-r from-brand-accent/20 to-indigo-500/5 text-white border-l-2 border-brand-accent shadow-sm' 
                : 'text-slate-400 hover:bg-dark-800 hover:text-slate-200'
              }
            `}
          >
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <>
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-brand-accent' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </nav>

      {/* User Status / System Mode Indicator */}
      <div className="p-4 border-t border-dark-700/40 bg-dark-950/40">
        <div className="flex items-center justify-between bg-dark-900/60 p-3 rounded-xl border border-dark-700/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
            <span className="text-xs font-semibold text-slate-400">Scraper Status</span>
          </div>
          <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-full font-bold">Active</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

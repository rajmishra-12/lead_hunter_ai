import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import { leadsService } from '../services/api.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiRefreshCw, FiArrowUpRight, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState('');

  const [isScanning, setIsScanning] = useState(false);

  React.useEffect(() => {
    const handleScanStart = () => setIsScanning(true);
    const handleScanEnd = () => setIsScanning(false);
    window.addEventListener('dashboard-scan-start', handleScanStart);
    window.addEventListener('dashboard-scan-end', handleScanEnd);
    return () => {
      window.removeEventListener('dashboard-scan-start', handleScanStart);
      window.removeEventListener('dashboard-scan-end', handleScanEnd);
    };
  }, []);

  const handleHeaderScan = () => {
    if (window.location.pathname !== '/') {
      navigate('/');
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('trigger-dashboard-scan'));
    }, 150);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(quickSearch)}`);
      setQuickSearch('');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex font-sans">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col pl-64">
        {/* Top Navbar */}
        <header className="h-16 border-b border-dark-700/60 bg-dark-900/65 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-slate-500 h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              placeholder="Quick search leads..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="w-full glass-input pl-10 text-xs py-1.5 focus:w-96 transition-all duration-300 placeholder-slate-500"
            />
          </form>

          {/* Quick Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleHeaderScan}
              disabled={isScanning}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accent hover:to-indigo-500 active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-glow transition-all"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Syncing...' : 'Scan Now'}</span>
            </button>
            
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 border border-dark-700/80 bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white rounded-xl transition-all"
              title="GitHub discussions"
            >
              <FiArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

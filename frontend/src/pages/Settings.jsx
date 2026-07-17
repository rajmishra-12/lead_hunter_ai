import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/api.js';
import { FiSettings, FiCheck, FiSave, FiAlertCircle } from 'react-icons/fi';

const Settings = () => {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });

  // Local Form state
  const [sources, setSources] = useState({
    reddit: false,
    hn: false,
    remoteok: false,
    devto: false,
    github: false,
    wellfound: false
  });
  const [keywords, setKeywords] = useState('');
  const [enableDesktop, setEnableDesktop] = useState(true);
  const [minScore, setMinScore] = useState('85');
  const [minBudget, setMinBudget] = useState('1500');
  const [theme, setTheme] = useState('dark');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state once settings load
  useEffect(() => {
    if (settingsData?.settings) {
      const s = settingsData.settings;
      
      // Parse active sources
      const activeSources = s.sources ? s.sources.split(',') : [];
      setSources({
        reddit: activeSources.includes('reddit'),
        hn: activeSources.includes('hn'),
        remoteok: activeSources.includes('remoteok'),
        devto: activeSources.includes('devto'),
        github: activeSources.includes('github'),
        wellfound: activeSources.includes('wellfound')
      });

      setKeywords(s.keywords || '');
      setEnableDesktop(s.enableDesktopNotifications === 'true');
      setMinScore(s.minScoreNotification || '85');
      setMinBudget(s.minBudgetNotification || '1500');
      setTheme(s.theme || 'dark');
    }
  }, [settingsData]);

  // Update Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: settingsService.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  });

  const handleSourceToggle = (key) => {
    setSources(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (e) => {
    e.preventDefault();

    // Reconstruct active sources array
    const activeSourcesArr = Object.entries(sources)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);

    const payload = {
      sources: activeSourcesArr.join(','),
      keywords,
      enableDesktopNotifications: String(enableDesktop),
      minScoreNotification: minScore,
      minBudgetNotification: minBudget,
      theme
    };

    updateSettingsMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-dark-800 rounded" />
        <div className="h-64 bg-dark-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-white">System Settings</h2>
        <p className="text-slate-400 text-xs mt-1">Manage scrapers, filters, system thresholds, and UI theme profiles.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Scraper Sources */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>1. Lead Scraper Sources</span>
          </h3>
          <p className="text-xs text-slate-400">Enable or disable crawling specific freelancing opportunities sites.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {Object.entries(sources).map(([key, enabled]) => (
              <label 
                key={key} 
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between
                  ${enabled 
                    ? 'bg-brand-accent/15 border-brand-accent text-white font-bold' 
                    : 'bg-dark-900/40 border-dark-700/60 text-slate-400 hover:border-dark-600'
                  }
                `}
              >
                <span className="capitalize font-semibold text-xs">{key === 'hn' ? 'Hacker News' : key}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => handleSourceToggle(key)}
                  className="w-4 h-4 rounded text-brand-accent bg-dark-950 border-dark-700 focus:ring-brand-accent cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Search Keywords */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
            2. Match Keywords
          </h3>
          <p className="text-xs text-slate-400">Comma-separated target terms used by scrapers to filter mobile opportunity matches.</p>
          <textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className="w-full bg-dark-950 border border-dark-800 text-xs text-slate-300 p-4 rounded-xl font-mono h-24 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none"
            placeholder="e.g. Flutter, React Native, iOS, Android..."
          />
        </div>

        {/* Notifications & Scores */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
            3. Notification Limits
          </h3>
          <p className="text-xs text-slate-400">Configure thresholds for dispatching macOS system/desktop notifications.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Toggle Enable */}
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={enableDesktop}
                  onChange={(e) => setEnableDesktop(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-accent bg-dark-950 border-dark-700 focus:ring-brand-accent"
                />
                <span>Enable Desktop Notifications</span>
              </label>
            </div>

            {/* Score Limit */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Minimum Score Notification</label>
              <input
                type="number"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="glass-input w-full text-xs py-1.5"
              />
            </div>

            {/* Budget Limit */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Minimum Budget Notification ($)</label>
              <input
                type="number"
                min="0"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                className="glass-input w-full text-xs py-1.5"
              />
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider">
            4. Interface Theme Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Color Palette Profile</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="glass-input w-full text-xs py-1.5 cursor-pointer"
              >
                <option value="dark">Deep Space (Violet & Indigo)</option>
                <option value="emerald">Mint Forest (Emerald & Teal)</option>
                <option value="amber">Desert Amber (Orange & Amber)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accent hover:to-indigo-500 text-white font-semibold text-xs px-6 py-3 rounded-xl shadow-glow active:scale-95 transition-all"
          >
            <FiSave className="w-4 h-4" />
            <span>{updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}</span>
          </button>
          
          {saveSuccess && (
            <div className="flex items-center gap-2 text-brand-green text-xs font-bold animate-fade-in">
              <FiCheck className="w-4 h-4" />
              <span>Configurations updated successfully!</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default Settings;

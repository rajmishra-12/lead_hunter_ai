import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import Saved from './pages/Saved.jsx';
import Search from './pages/Search.jsx';
import Analytics from './pages/Analytics.jsx';
import ProposalGenerator from './pages/ProposalGenerator.jsx';
import Settings from './pages/Settings.jsx';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/search" element={<Search />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/proposal-generator" element={<ProposalGenerator />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;

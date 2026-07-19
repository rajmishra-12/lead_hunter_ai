import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const leadsService = {
  getLeads: async (params) => {
    const response = await api.get('/leads', { params });
    return response.data;
  },
  
  getLeadById: async (id) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
  },

  updateLeadStatus: async (id, payload) => {
    const response = await api.put(`/leads/${id}`, payload);
    return response.data;
  },

  saveLead: async (leadId) => {
    const response = await api.post('/leads/save', { leadId });
    return response.data;
  },

  unsaveLead: async (leadId) => {
    const response = await api.delete('/leads/save', { data: { leadId } });
    return response.data;
  },

  getSavedLeads: async () => {
    const response = await api.get('/leads/saved');
    return response.data;
  },

  triggerScraping: async () => {
    const response = await api.post('/leads/scrape');
    return response.data;
  },

  triggerScanStream: async (onProgress) => {
    const response = await fetch(`${API_BASE_URL.replace(/\/api$/, '')}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.body) {
      throw new Error('ReadableStream not supported by this browser/server response.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            onProgress(data);
          } catch (err) {
            console.error('Failed to parse streaming line:', line, err);
          }
        }
      }
    }
  },

  clearLeads: async () => {
    const response = await api.delete('/leads');
    return response.data;
  },

  getExportCsvUrl: () => `${API_BASE_URL}/leads/export/csv`,
  getExportJsonUrl: () => `${API_BASE_URL}/leads/export/json`
};

export const analyticsService = {
  getAnalytics: async () => {
    const response = await api.get('/analytics');
    return response.data;
  }
};

export const settingsService = {
  getSettings: async () => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/settings', settings);
    return response.data;
  }
};

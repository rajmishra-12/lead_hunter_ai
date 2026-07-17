import express from 'express';
import { 
  getLeads, 
  getLeadById, 
  updateLeadStatus, 
  saveLead, 
  unsaveLead, 
  triggerScraping, 
  getSavedLeads,
  exportCSV,
  exportJSON
} from '../controllers/leadsController.js';

const router = express.Router();

router.get('/', getLeads);
router.post('/scrape', triggerScraping);
router.get('/saved', getSavedLeads);
router.post('/save', saveLead);
router.delete('/save', unsaveLead);

// Exporting
router.get('/export/csv', exportCSV);
router.get('/export/json', exportJSON);

// Details must be declared last or under a distinct path
router.get('/:id', getLeadById);
router.put('/:id', updateLeadStatus);

export default router;

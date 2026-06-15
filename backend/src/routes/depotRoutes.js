const express = require('express');
const router = express.Router();
const depotController = require('../controllers/depotController');

// Specific routes first (with parameters that need exact matches)
router.get('/with-stats', depotController.getAllDepotsWithStats);
router.get('/dashboard/:depotId', depotController.getDepotDashboard);

// Generic routes
router.get('/', depotController.getAllDepots);
router.post('/', depotController.createDepot);
router.put('/:id', depotController.updateDepot);
router.delete('/:id', depotController.deleteDepot);

module.exports = router;
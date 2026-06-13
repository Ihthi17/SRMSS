const express = require('express');
const router = express.Router();
const depotController = require('../controllers/depotController');

router.get('/', depotController.getAllDepots);
router.post('/', depotController.createDepot);
router.put('/:id', depotController.updateDepot);
router.delete('/:id', depotController.deleteDepot);

module.exports = router;
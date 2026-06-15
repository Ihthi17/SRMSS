const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/settingsController');

// ── Database Backup ──
router.post('/backup/create', ctrl.createBackup);
router.get('/backup/list', ctrl.listBackups);
router.post('/backup/restore', ctrl.restoreBackup);
router.delete('/backup/:filename', ctrl.deleteBackup);
router.get('/backup/download/:filename', ctrl.downloadBackup);

// ── SMTP ──
router.get('/smtp', ctrl.getSmtpSettings);
router.post('/smtp', ctrl.saveSmtpSettings);
router.post('/smtp/test', ctrl.testSmtp);

// ── Forgot Password (uses saved SMTP) ──
router.post('/forgot-password', ctrl.forgotPassword);

module.exports = router;

/**
 * مسارات الإعدادات
 */

const express = require('express');
const settingsController = require('../controllers/settingsController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// إعدادات عامة للواجهة
router.get('/public', settingsController.getPublicSettings);

// إعدادات كاملة + تحديث (أدمن)
router.get('/', requireAdmin, settingsController.getSettings);
router.put('/', requireAdmin, settingsController.updateSettings);

module.exports = router;

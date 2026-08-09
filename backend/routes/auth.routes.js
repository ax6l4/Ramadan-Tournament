/**
 * مسارات المصادقة
 */

const express = require('express');
const authController = require('../controllers/authController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// تسجيل دخول الأدمن
router.post('/login', authController.login);

// التحقق من الجلسة الحالية
router.get('/me', requireAdmin, authController.getCurrentAdmin);

module.exports = router;

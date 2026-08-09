/**
 * مسارات اللاعبين
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const playersController = require('../controllers/playersController');
const { requireAdmin } = require('../middleware/auth');
const config = require('../config/config');

const router = express.Router();

/**
 * وسيط اختياري: يربط req.admin إذا وُجد توكن صالح
 * بدون إرجاع خطأ إذا لم يوجد توكن (للتسجيل العام)
 */
function optionalAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme === 'Bearer' && token) {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.admin = {
        id: decoded.id,
        email: decoded.email,
      };
    }
  } catch (error) {
    // تجاهل التوكن غير الصالح — يبقى الطلب كمستخدم عام
    req.admin = undefined;
  }

  return next();
}

// تسجيل لاعب (عام أو أدمن)
router.post('/', optionalAdmin, playersController.createPlayer);

// المسارات التالية للأدمن فقط — الترتيب مهم: export قبل :id
router.get('/export', requireAdmin, playersController.exportPlayers);
router.get('/', requireAdmin, playersController.getPlayers);
router.delete('/', requireAdmin, playersController.deleteAllPlayers);
router.delete('/:id', requireAdmin, playersController.deletePlayer);

module.exports = router;

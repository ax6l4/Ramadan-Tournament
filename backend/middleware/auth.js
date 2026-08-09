/**
 * وسيط التحقق من صلاحية الأدمن عبر JWT
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * حماية المسارات التي تتطلب تسجيل دخول أدمن
 */
function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // إرفاق بيانات الأدمن بالطلب لاستخدامها لاحقاً
    req.admin = {
      id: decoded.id,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'جلسة غير صالحة أو منتهية. سجّل الدخول مرة أخرى',
    });
  }
}

module.exports = {
  requireAdmin,
};

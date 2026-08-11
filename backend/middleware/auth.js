/**
 * Admin authentication middleware.
 * JWT is used instead of sessions so the API stays stateless on Render.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

function readBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

/**
 * Blocks the request unless a valid admin token is present.
 */
function requireAdmin(req, res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول للوصول إلى هذه الصفحة',
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
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

/**
 * Used on public registration: if an admin token exists, the request
 * can bypass the "registration closed" lock. Invalid tokens are ignored.
 */
function optionalAdmin(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.admin = {
        id: decoded.id,
        email: decoded.email,
      };
    }
  } catch (error) {
    req.admin = undefined;
  }

  return next();
}

module.exports = {
  requireAdmin,
  optionalAdmin,
};

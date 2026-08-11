/**
 * Admin login.
 * Failure messages stay generic so attackers cannot probe whether
 * a username exists.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { findAdminByUsername } = require('../db/database');
const config = require('../config/config');
const {
  validateUsername,
  validatePassword,
} = require('../utils/validators');

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const usernameResult = validateUsername(
      req.body?.username ?? req.body?.email
    );
    const passwordResult = validatePassword(req.body?.password);

    if (!usernameResult.valid || !passwordResult.valid) {
      return res.status(400).json({
        success: false,
        message: usernameResult.message || passwordResult.message,
      });
    }

    const admin = await findAdminByUsername(usernameResult.value);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    const passwordMatches = bcrypt.compareSync(
      passwordResult.value,
      admin.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.email,
          email: admin.email,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

function getCurrentAdmin(req, res) {
  return res.json({
    success: true,
    data: {
      admin: req.admin,
    },
  });
}

module.exports = {
  login,
  getCurrentAdmin,
};

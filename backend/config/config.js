/**
 * إعدادات التطبيق المركزية
 * Central application configuration
 * القيم الحساسة تُقرأ من متغيرات البيئة عند النشر
 */

const path = require('path');

const config = {
  // Render يمرّر PORT — يجب الاستماع عليه في الإنتاج
  port: Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 3000,

  // بيئة التشغيل: development | production
  nodeEnv: process.env.NODE_ENV || 'development',

  // مفتاح توقيع JWT — غيّره في الإنتاج عبر متغير البيئة
  jwtSecret: process.env.JWT_SECRET || 'ramadan-tournament-dev-secret-change-me',

  // مدة صلاحية توكن الأدمن
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  // مسار ملف قاعدة البيانات SQLite
  databasePath:
    process.env.DATABASE_PATH ||
    path.join(__dirname, '..', '..', 'database', 'tournament.db'),

  // بيانات الأدمن الافتراضي
  defaultAdmin: {
    username: process.env.ADMIN_USERNAME || 'Abdul Rahman',
    password: process.env.ADMIN_PASSWORD || 'Aa91141702',
  },
};

module.exports = config;

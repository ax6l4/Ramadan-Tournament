/**
 * نقطة تشغيل سيرفر فريق الروضة
 * يعمل محلياً بـ SQLite وعلى الاستضافة بـ PostgreSQL
 */

const path = require('path');
const express = require('express');
const cors = require('cors');

const config = require('./config/config');
const { initDatabase } = require('./db/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const playersRoutes = require('./routes/players.routes');
const settingsRoutes = require('./routes/settings.routes');

async function startServer() {
  await initDatabase();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));

  const frontendPath = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendPath));

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'الخادم يعمل',
      env: config.nodeEnv,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/players', playersRoutes);
  app.use('/api/settings', settingsRoutes);

  // أي مسار غير API وغير موجود كملف ثابت
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(path.join(frontendPath, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(config.port, '0.0.0.0', () => {
    console.log('========================================');
    console.log('  فريق الروضة — موقع التسجيل');
    console.log(`  المنفذ: ${config.port}`);
    console.log('========================================');
  });
}

startServer().catch((error) => {
  console.error('فشل تشغيل السيرفر:', error);
  process.exit(1);
});

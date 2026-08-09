/**
 * سكربت تحقق سريع من تهيئة قاعدة البيانات
 */
const { initDatabase, getDb } = require('../db/database');

initDatabase();
const db = getDb();

console.log(
  'Tables:',
  db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()
);
console.log('Admin:', db.prepare('SELECT id, email FROM admins').all());
console.log('Settings:', db.prepare('SELECT key, value FROM settings').all());
console.log('DB OK');

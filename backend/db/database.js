/**
 * طبقة الوصول للبيانات
 * - محلياً: SQLite (better-sqlite3)
 * - على الاستضافة: PostgreSQL عبر process.env.DATABASE_URL
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// تفضيل IPv4 يقلل أخطاء DNS على بعض بيئات Render
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const usePostgres = Boolean(
  process.env.DATABASE_URL || process.env.EXTERNAL_DATABASE_URL
);

let sqliteDb = null;
let pgPool = null;

/**
 * تنظيف قيمة DATABASE_URL من علامات الاقتباس أو المسافات الزائدة
 * @param {string} value
 * @returns {string}
 */
function normalizeDatabaseUrl(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  let url = value.trim();

  // إزالة اقتباس محيط إن وُجد من لوحة التحكم
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  return url;
}

/**
 * اختيار أفضل رابط اتصال متاح من متغيرات البيئة
 * يفضّل EXTERNAL_DATABASE_URL إن وُجد (hostname كامل .render.com)
 * @returns {string}
 */
function resolveDatabaseUrl() {
  const externalUrl = normalizeDatabaseUrl(process.env.EXTERNAL_DATABASE_URL);
  const primaryUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

  // الرابط الخارجي يعمل حتى مع اختلاف المنطقة
  if (externalUrl) {
    return externalUrl;
  }

  return primaryUrl;
}

/**
 * هل الـ hostname يبدو كـ internal host ناقص على Render؟
 * مثال غير صالح للـ DNS العام: dpg-xxxxx-a
 * مثال صالح: dpg-xxxxx-a.frankfurt-postgres.render.com
 * @param {string} databaseUrl
 * @returns {boolean}
 */
function isLikelyIncompleteRenderHost(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname || '';
    return /^dpg-[a-z0-9]+-a$/i.test(host);
  } catch (error) {
    return false;
  }
}

/**
 * إنشاء Pool متوافق مع Render PostgreSQL
 * @param {string} databaseUrl
 */
function createPgPool(databaseUrl) {
  const { Pool } = require('pg');

  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const forceSslOff = process.env.PGSSL === 'false';
  const forceSslOn = process.env.PGSSL === 'true';

  // Render: SSL مطلوب للرابط الخارجي (.render.com) ويُفعّل في الإنتاج
  const looksLikeRender =
    databaseUrl.includes('render.com') || isLikelyIncompleteRenderHost(databaseUrl);
  const useSsl =
    forceSslOn || (!forceSslOff && (isProduction || looksLikeRender));

  /** @type {import('pg').PoolConfig} */
  const poolConfig = {
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
    // IPv4 يقلل getaddrinfo ENOTFOUND على بعض شبكات Render
    family: 4,
  };

  if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  // سجل تشخيصي بدون كلمة المرور
  try {
    const parsed = new URL(databaseUrl);
    console.log(
      `[DB] Connecting to PostgreSQL host="${parsed.hostname}" db="${parsed.pathname.replace('/', '')}" ssl=${Boolean(useSsl)}`
    );
  } catch (error) {
    console.warn('[DB] DATABASE_URL could not be parsed as a URL');
  }

  if (isLikelyIncompleteRenderHost(databaseUrl)) {
    console.warn(
      '[DB] WARNING: DATABASE_URL uses an internal Render hostname without a domain. ' +
        'If startup fails with ENOTFOUND, set EXTERNAL_DATABASE_URL to the External Database URL from the Render dashboard, ' +
        'and ensure the web service and Postgres are in the SAME region.'
    );
  }

  return new Pool(poolConfig);
}

/**
 * تهيئة قاعدة البيانات حسب البيئة
 */
async function initDatabase() {
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

  if (isProduction && !resolveDatabaseUrl()) {
    throw new Error(
      'DATABASE_URL is required in production. Set it to the Render Postgres connection string.'
    );
  }

  if (usePostgres) {
    const databaseUrl = resolveDatabaseUrl();

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is missing. Set it to your Render Postgres connection string.');
    }

    pgPool = createPgPool(databaseUrl);

    try {
      // اختبار الاتصال مبكراً لرسالة خطأ أوضح
      await pgPool.query('SELECT 1');
    } catch (error) {
      const hostHint = (() => {
        try {
          return new URL(databaseUrl).hostname;
        } catch (parseError) {
          return '(unparseable host)';
        }
      })();

      if (error && error.code === 'ENOTFOUND') {
        throw new Error(
          `PostgreSQL host could not be resolved (${hostHint}). ` +
            `On Render: 1) put Web Service + Postgres in the SAME region, ` +
            `2) or set EXTERNAL_DATABASE_URL to the External Database URL from the database Info page. ` +
            `Original error: ${error.message}`
        );
      }

      throw error;
    }

    await createPostgresTables();
    await seedAdminAndSettings();
    console.log('[DB] Connected to PostgreSQL');
    return;
  }

  const databaseDir = path.dirname(config.databasePath);
  if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir, { recursive: true });
  }

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    throw new Error(
      'SQLite driver is unavailable. For Render, set DATABASE_URL to your PostgreSQL connection string.'
    );
  }
  sqliteDb = new Database(config.databasePath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  createSqliteTables();
  await seedAdminAndSettings();
  console.log('[DB] Connected to SQLite');
}

function createSqliteTables() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_team_leader INTEGER NOT NULL DEFAULT 0 CHECK (is_team_leader IN (0, 1)),
      sport TEXT NOT NULL CHECK (sport IN ('football', 'volleyball', 'both')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_players_full_name_unique ON players(full_name);
    CREATE INDEX IF NOT EXISTS idx_players_phone ON players(phone);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

async function createPostgresTables() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_team_leader BOOLEAN NOT NULL DEFAULT FALSE,
      sport TEXT NOT NULL CHECK (sport IN ('football', 'volleyball', 'both')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_players_full_name_unique ON players (LOWER(full_name));
    CREATE INDEX IF NOT EXISTS idx_players_phone ON players(phone);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function seedAdminAndSettings() {
  const passwordHash = bcrypt.hashSync(config.defaultAdmin.password, 12);
  const username = config.defaultAdmin.username;

  if (usePostgres) {
    const existing = await pgPool.query('SELECT id FROM admins ORDER BY id ASC LIMIT 1');
    if (existing.rows.length === 0) {
      await pgPool.query(
        'INSERT INTO admins (email, password_hash) VALUES ($1, $2)',
        [username, passwordHash]
      );
      console.log(`[DB] Default admin created: ${username}`);
    } else {
      await pgPool.query(
        'UPDATE admins SET email = $1, password_hash = $2 WHERE id = $3',
        [username, passwordHash, existing.rows[0].id]
      );
      console.log(`[DB] Admin credentials synced: ${username}`);
    }

    await pgPool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('site_title', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      ['فريق الروضة']
    );
    await pgPool.query(
      `INSERT INTO settings (key, value) VALUES ('registration_open', '1')
       ON CONFLICT (key) DO NOTHING`
    );
    await pgPool.query(
      `INSERT INTO settings (key, value)
       VALUES ('registration_closed_message', 'التسجيل مغلق حالياً. يرجى المحاولة لاحقاً.')
       ON CONFLICT (key) DO NOTHING`
    );
    return;
  }

  const existingAdmin = sqliteDb.prepare('SELECT id FROM admins LIMIT 1').get();
  if (!existingAdmin) {
    sqliteDb
      .prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)')
      .run(username, passwordHash);
    console.log(`[DB] Default admin created: ${username}`);
  } else {
    sqliteDb
      .prepare('UPDATE admins SET email = ?, password_hash = ? WHERE id = ?')
      .run(username, passwordHash, existingAdmin.id);
    console.log(`[DB] Admin credentials synced: ${username}`);
  }

  sqliteDb
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .run('site_title', 'فريق الروضة');

  sqliteDb
    .prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    .run('registration_open', '1');
  sqliteDb
    .prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    .run(
      'registration_closed_message',
      'التسجيل مغلق حالياً. يرجى المحاولة لاحقاً.'
    );
}

/** تحويل ? إلى $1,$2 لـ PostgreSQL */
function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function getOne(sql, params = []) {
  if (usePostgres) {
    const result = await pgPool.query(toPg(sql), params);
    return result.rows[0] || null;
  }
  return sqliteDb.prepare(sql).get(...params) || null;
}

async function getMany(sql, params = []) {
  if (usePostgres) {
    const result = await pgPool.query(toPg(sql), params);
    return result.rows;
  }
  return sqliteDb.prepare(sql).all(...params);
}

async function run(sql, params = []) {
  if (usePostgres) {
    const result = await pgPool.query(toPg(sql), params);
    return {
      changes: result.rowCount || 0,
      lastInsertRowid: result.rows[0]?.id,
    };
  }
  const info = sqliteDb.prepare(sql).run(...params);
  return {
    changes: info.changes,
    lastInsertRowid: info.lastInsertRowid,
  };
}

async function findAdminByUsername(username) {
  if (usePostgres) {
    return getOne(
      'SELECT id, email, password_hash FROM admins WHERE LOWER(email) = LOWER(?)',
      [username]
    );
  }
  return getOne(
    'SELECT id, email, password_hash FROM admins WHERE email = ? COLLATE NOCASE',
    [username]
  );
}

async function getSetting(key) {
  return getOne('SELECT value FROM settings WHERE key = ?', [key]);
}

async function getPublicSettingsRows() {
  return getMany(
    `SELECT key, value FROM settings
     WHERE key IN ('registration_open', 'registration_closed_message', 'site_title')`
  );
}

async function getAllSettings() {
  return getMany('SELECT key, value, updated_at FROM settings');
}

async function upsertSetting(key, value) {
  if (usePostgres) {
    await run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
    return;
  }
  await run(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value]
  );
}

async function findPlayerByName(fullName) {
  if (usePostgres) {
    return getOne(
      'SELECT id FROM players WHERE LOWER(full_name) = LOWER(?)',
      [fullName]
    );
  }
  return getOne(
    'SELECT id FROM players WHERE full_name = ? COLLATE NOCASE',
    [fullName]
  );
}

async function insertPlayer(data) {
  if (usePostgres) {
    const result = await pgPool.query(
      `INSERT INTO players (full_name, phone, is_team_leader, sport)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.full_name,
        data.phone,
        Boolean(data.is_team_leader),
        data.sport,
      ]
    );
    return result.rows[0];
  }

  const info = sqliteDb
    .prepare(
      `INSERT INTO players (full_name, phone, is_team_leader, sport)
       VALUES (?, ?, ?, ?)`
    )
    .run(data.full_name, data.phone, data.is_team_leader, data.sport);

  return sqliteDb.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid);
}

async function listPlayers(search = '') {
  if (search) {
    const like = `%${search}%`;
    return getMany(
      `SELECT * FROM players
       WHERE full_name LIKE ? OR phone LIKE ?
       ORDER BY id ASC`,
      [like, like]
    );
  }
  return getMany('SELECT * FROM players ORDER BY id ASC');
}

async function deletePlayerById(id) {
  return run('DELETE FROM players WHERE id = ?', [id]);
}

async function deleteAllPlayers() {
  return run('DELETE FROM players');
}

module.exports = {
  initDatabase,
  usePostgres,
  findAdminByUsername,
  getSetting,
  getPublicSettingsRows,
  getAllSettings,
  upsertSetting,
  findPlayerByName,
  insertPlayer,
  listPlayers,
  deletePlayerById,
  deleteAllPlayers,
};

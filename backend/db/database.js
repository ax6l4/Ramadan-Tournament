/**
 * طبقة الوصول للبيانات
 * - محلياً: SQLite (better-sqlite3)
 * - على الاستضافة: PostgreSQL عبر DATABASE_URL (دائمة حتى مع إغلاق اللابتوب)
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const config = require('../config/config');

const usePostgres = Boolean(process.env.DATABASE_URL);

let sqliteDb = null;
let pgPool = null;

/**
 * تهيئة قاعدة البيانات حسب البيئة
 */
async function initDatabase() {
  if (usePostgres) {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
    });
    await createPostgresTables();
    await seedAdminAndSettings();
    console.log('[DB] Connected to PostgreSQL');
    return;
  }

  const databaseDir = path.dirname(config.databasePath);
  if (!fs.existsSync(databaseDir)) {
    fs.mkdirSync(databaseDir, { recursive: true });
  }

  const Database = require('better-sqlite3');
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

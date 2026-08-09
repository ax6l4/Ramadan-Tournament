const { initDatabase, getDb } = require('../db/database');

initDatabase();
const db = getDb();
console.log(
  db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='players'"
    )
    .all()
);

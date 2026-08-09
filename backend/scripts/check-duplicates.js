const { initDatabase, getDb } = require('../db/database');

initDatabase();
const db = getDb();

console.log('Players:');
console.log(
  db.prepare('SELECT id, full_name, phone, length(full_name) AS len FROM players ORDER BY id').all()
);

console.log('Duplicate names:');
console.log(
  db
    .prepare(
      `SELECT full_name, COUNT(*) AS c
       FROM players
       GROUP BY full_name
       HAVING c > 1`
    )
    .all()
);

console.log('Indexes:');
console.log(
  db
    .prepare(
      "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='players'"
    )
    .all()
);

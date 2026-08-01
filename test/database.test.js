const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'packetbbs-test-'));
const testDbPath = path.join(testDir, 'packetbbs.db');
process.env.PACKETBBS_DB_PATH = testDbPath;

const database = require('../src/core/database');

test.after(() => {
  delete process.env.PACKETBBS_DB_PATH;
  fs.rmSync(testDir, { recursive: true, force: true });
});

test('database override, fresh content, and exact-match rename migration are safe', () => {
  assert.equal(database.resolveDatabasePath(), testDbPath);

  const preMenuModeDb = new Database(testDbPath);
  preMenuModeDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      real_name TEXT DEFAULT '',
      location TEXT DEFAULT '',
      email TEXT DEFAULT '',
      access_level INTEGER DEFAULT 10,
      total_calls INTEGER DEFAULT 0,
      total_posts INTEGER DEFAULT 0,
      total_uploads INTEGER DEFAULT 0,
      total_downloads INTEGER DEFAULT 0,
      last_call_date TEXT,
      first_call_date TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  preMenuModeDb.close();

  const db = database.init();
  const bulletin = db.prepare('SELECT title, body FROM bulletins LIMIT 1').get();
  const message = db.prepare('SELECT subject, body FROM messages WHERE base_id = 1 LIMIT 1').get();
  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);

  assert.equal(bulletin.title, 'Welcome to PacketBBS!');
  assert.match(bulletin.body, /multi-node bulletin board system/);
  assert.match(bulletin.body, /Vibe Community/);
  assert.equal(message.subject, 'Welcome to PacketBBS!');
  assert.doesNotMatch(message.body, /VibeBBS/);
  assert.ok(userColumns.includes('menu_mode'));
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get().count,
    14
  );

  const legacyBulletinBody = 'Welcome to VibeBBS, the bulletin board system for vibe coders!\r\n\r\n' +
    'This is a place where retro meets the future. Share your AI-assisted\r\n' +
    'coding projects, swap prompts, play door games, and connect with\r\n' +
    'fellow vibe coders.\r\n\r\n' +
    'Check out the Message Bases to start chatting, or hit up the Door\r\n' +
    'Games for some classic fun.\r\n\r\n' +
    'Keep vibing! - SysOp';

  db.prepare('UPDATE bulletins SET title = ?, body = ? WHERE id = 1')
    .run('Welcome to VibeBBS!', legacyBulletinBody);
  db.prepare('INSERT INTO bulletins (title, body, author) VALUES (?, ?, ?)')
    .run('Welcome to VibeBBS!', 'A caller-authored custom bulletin', 'Caller');

  const seededPoll = db.prepare(`
    SELECT id FROM polls WHERE author = 'SysOp' AND question = ?
  `).get('What brings you back to a BBS?');
  const seededOptions = db.prepare(`
    SELECT id FROM poll_options WHERE poll_id = ? ORDER BY sort_order, id
  `).all(seededPoll.id);
  const oldQuestion = 'What is your favorite AI coding assistant?';
  const oldOptions = ['Claude', 'ChatGPT', 'Copilot', 'Gemini', 'Other'];
  db.prepare('UPDATE polls SET question = ? WHERE id = ?').run(oldQuestion, seededPoll.id);
  const updateOption = db.prepare('UPDATE poll_options SET option_text = ? WHERE id = ?');
  seededOptions.forEach((option, index) => updateOption.run(oldOptions[index], option.id));
  const sysop = db.prepare("SELECT id FROM users WHERE username = 'SysOp'").get();
  db.prepare('INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)')
    .run(seededPoll.id, seededOptions[0].id, sysop.id);
  db.close();

  const migratedDb = database.init();
  const migratedStock = migratedDb.prepare('SELECT title FROM bulletins WHERE id = 1').get();
  const custom = migratedDb.prepare("SELECT title FROM bulletins WHERE author = 'Caller'").get();
  assert.equal(migratedStock.title, 'Welcome to PacketBBS!');
  assert.equal(custom.title, 'Welcome to VibeBBS!');
  const preservedVote = migratedDb.prepare(`
    SELECT p.question, po.option_text
    FROM poll_votes pv
    JOIN polls p ON p.id = pv.poll_id
    JOIN poll_options po ON po.id = pv.option_id
    WHERE pv.poll_id = ?
  `).get(seededPoll.id);
  assert.equal(preservedVote.question, oldQuestion);
  assert.equal(preservedVote.option_text, 'Claude');
  const replacementPoll = migratedDb.prepare(`
    SELECT id FROM polls WHERE author = 'SysOp' AND question = ?
  `).get('What brings you back to a BBS?');
  assert.ok(replacementPoll);
  assert.notEqual(replacementPoll.id, seededPoll.id);
  migratedDb.close();
});

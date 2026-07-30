const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

  const db = database.init();
  const bulletin = db.prepare('SELECT title, body FROM bulletins LIMIT 1').get();
  const message = db.prepare('SELECT subject, body FROM messages WHERE base_id = 1 LIMIT 1').get();

  assert.equal(bulletin.title, 'Welcome to PacketBBS!');
  assert.match(bulletin.body, /Vibe Sub-BBS/);
  assert.equal(message.subject, 'Welcome to PacketBBS!');
  assert.doesNotMatch(message.body, /VibeBBS/);
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
  db.close();

  const migratedDb = database.init();
  const migratedStock = migratedDb.prepare('SELECT title FROM bulletins WHERE id = 1').get();
  const custom = migratedDb.prepare("SELECT title FROM bulletins WHERE author = 'Caller'").get();
  assert.equal(migratedStock.title, 'Welcome to PacketBBS!');
  assert.equal(custom.title, 'Welcome to VibeBBS!');
  migratedDb.close();
});

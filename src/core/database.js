const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'vibebbs.db');

let db;

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const result = crypto.scryptSync(password, salt, 64).toString('hex');
  return result === hash;
}

function init() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
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
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_id INTEGER NOT NULL,
      from_user TEXT NOT NULL,
      to_user TEXT DEFAULT 'All',
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      reply_to INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_read (
      user_id INTEGER NOT NULL,
      message_id INTEGER NOT NULL,
      read_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, message_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    );

    CREATE TABLE IF NOT EXISTS call_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      login_time TEXT DEFAULT (datetime('now')),
      logout_time TEXT,
      node_num INTEGER
    );

    CREATE TABLE IF NOT EXISTS bulletins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT DEFAULT 'SysOp',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      description TEXT DEFAULT '',
      size INTEGER DEFAULT 0,
      uploaded_by TEXT NOT NULL,
      download_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS graffiti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS private_mail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user TEXT NOT NULL,
      to_user TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      author TEXT DEFAULT 'SysOp',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (poll_id) REFERENCES polls(id)
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(poll_id, user_id),
      FOREIGN KEY (poll_id) REFERENCES polls(id),
      FOREIGN KEY (option_id) REFERENCES poll_options(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS motd (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      body TEXT NOT NULL,
      author TEXT DEFAULT 'SysOp',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dungeon_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      hp INTEGER DEFAULT 30,
      max_hp INTEGER DEFAULT 30,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      gold INTEGER DEFAULT 50,
      attack INTEGER DEFAULT 5,
      defense INTEGER DEFAULT 3,
      room TEXT DEFAULT 'entrance_hall',
      inventory TEXT DEFAULT '[]',
      status TEXT DEFAULT 'alive',
      turns_played INTEGER DEFAULT 0,
      monsters_slain INTEGER DEFAULT 0,
      deepest_floor INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS dungeon_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_dungeon_history_user ON dungeon_history(user_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_messages_base ON messages(base_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_files_area ON files(area_id);
    CREATE INDEX IF NOT EXISTS idx_private_mail_to ON private_mail(to_user);
    CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
  `);

  // Seed default sysop user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const { hash, salt } = hashPassword('sysop');
    db.prepare(`
      INSERT INTO users (username, password_hash, password_salt, real_name, access_level)
      VALUES (?, ?, ?, ?, ?)
    `).run('SysOp', hash, salt, 'System Operator', 255);

    // Seed a welcome bulletin
    db.prepare(`
      INSERT INTO bulletins (title, body, author)
      VALUES (?, ?, ?)
    `).run(
      'Welcome to VibeBBS!',
      'Welcome to VibeBBS, the bulletin board system for vibe coders!\r\n\r\n' +
      'This is a place where retro meets the future. Share your AI-assisted\r\n' +
      'coding projects, swap prompts, play door games, and connect with\r\n' +
      'fellow vibe coders.\r\n\r\n' +
      'Check out the Message Bases to start chatting, or hit up the Door\r\n' +
      'Games for some classic fun.\r\n\r\n' +
      'Keep vibing! - SysOp',
      'SysOp'
    );

    // Seed some welcome messages
    db.prepare(`
      INSERT INTO messages (base_id, from_user, to_user, subject, body)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, 'SysOp', 'All', 'Welcome to VibeBBS!',
      'Welcome to VibeBBS! This is the General Discussion area.\r\n' +
      'Feel free to introduce yourself and start chatting.\r\n\r\n' +
      'Remember: Be excellent to each other!');

    // Seed MOTD
    db.prepare(`
      INSERT INTO motd (body, author) VALUES (?, ?)
    `).run(
      'Welcome to VibeBBS! Check out the Message Bases, play some Door Games,\r\n' +
      'and leave your mark on the Graffiti Wall. New features added regularly!\r\n' +
      '\r\n' +
      'Remember: Be excellent to each other. Keep vibing!',
      'SysOp'
    );

    // Seed a sample poll
    const pollResult = db.prepare(`
      INSERT INTO polls (question, author) VALUES (?, ?)
    `).run('What is your favorite AI coding assistant?', 'SysOp');
    const pollId = pollResult.lastInsertRowid;
    const pollOptions = ['Claude', 'ChatGPT', 'Copilot', 'Gemini', 'Other'];
    for (let i = 0; i < pollOptions.length; i++) {
      db.prepare('INSERT INTO poll_options (poll_id, option_text, sort_order) VALUES (?, ?, ?)').run(pollId, pollOptions[i], i);
    }

    // Seed graffiti wall
    db.prepare('INSERT INTO graffiti (username, message) VALUES (?, ?)').run('SysOp', 'First! Welcome to VibeBBS - leave your mark here!');

    db.prepare(`
      INSERT INTO messages (base_id, from_user, to_user, subject, body)
      VALUES (?, ?, ?, ?, ?)
    `).run(2, 'SysOp', 'All', 'Vibe Coding Tips',
      'Share your best vibe coding tips here!\r\n\r\n' +
      '1. Start with a clear CLAUDE.md file\r\n' +
      '2. Let the AI understand your project structure\r\n' +
      '3. Iterate quickly and keep the vibes flowing\r\n' +
      '4. Don\'t fight the suggestions - flow with them');
  }

  return db;
}

// User operations
const users = {
  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  authenticate(username, password) {
    const user = this.findByUsername(username);
    if (!user) return null;
    if (verifyPassword(password, user.password_hash, user.password_salt)) {
      return user;
    }
    return null;
  },

  create(username, password, realName = '') {
    const { hash, salt } = hashPassword(password);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, password_salt, real_name)
      VALUES (?, ?, ?, ?)
    `).run(username, hash, salt, realName);
    return this.findByUsername(username);
  },

  updateLastCall(userId) {
    db.prepare(`
      UPDATE users SET last_call_date = datetime('now'), total_calls = total_calls + 1
      WHERE id = ?
    `).run(userId);
  },

  incrementPosts(userId) {
    db.prepare('UPDATE users SET total_posts = total_posts + 1 WHERE id = ?').run(userId);
  },

  getAll() {
    return db.prepare('SELECT id, username, real_name, location, access_level, total_calls, total_posts, last_call_date, first_call_date FROM users ORDER BY username').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  update(id, fields) {
    const allowed = ['real_name', 'location', 'email', 'access_level'];
    const sets = [];
    const values = [];
    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        sets.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (sets.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  resetPassword(id, newPassword) {
    const { hash, salt } = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').run(hash, salt, id);
  },

  getStats() {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalCalls = db.prepare('SELECT COALESCE(SUM(total_calls), 0) as total FROM users').get().total;
    return { totalUsers, totalCalls };
  }
};

// Message operations
const messages = {
  getByBase(baseId) {
    return db.prepare('SELECT * FROM messages WHERE base_id = ? ORDER BY created_at ASC').all(baseId);
  },

  getById(id) {
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  },

  create(baseId, fromUser, toUser, subject, body, replyTo = null) {
    const result = db.prepare(`
      INSERT INTO messages (base_id, from_user, to_user, subject, body, reply_to)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(baseId, fromUser, toUser || 'All', subject, body, replyTo);
    return result.lastInsertRowid;
  },

  countByBase(baseId) {
    return db.prepare('SELECT COUNT(*) as count FROM messages WHERE base_id = ?').get(baseId).count;
  },

  countUnreadByBase(baseId, userId) {
    return db.prepare(`
      SELECT COUNT(*) as count FROM messages m
      WHERE m.base_id = ? AND m.id NOT IN (
        SELECT message_id FROM message_read WHERE user_id = ?
      )
    `).get(baseId, userId).count;
  },

  markRead(messageId, userId) {
    db.prepare(`
      INSERT OR IGNORE INTO message_read (user_id, message_id) VALUES (?, ?)
    `).run(userId, messageId);
  },

  getTotal() {
    return db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  },

  delete(id) {
    db.prepare('DELETE FROM message_read WHERE message_id = ?').run(id);
    db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }
};

// Bulletin operations
const bulletins = {
  getActive() {
    return db.prepare('SELECT * FROM bulletins WHERE active = 1 ORDER BY created_at DESC').all();
  },

  getAll() {
    return db.prepare('SELECT * FROM bulletins ORDER BY created_at DESC').all();
  },

  create(title, body, author = 'SysOp') {
    return db.prepare('INSERT INTO bulletins (title, body, author) VALUES (?, ?, ?)').run(title, body, author);
  },

  delete(id) {
    db.prepare('DELETE FROM bulletins WHERE id = ?').run(id);
  },

  toggle(id) {
    db.prepare('UPDATE bulletins SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  }
};

// Call log operations
const callLog = {
  logLogin(userId, username, nodeNum) {
    return db.prepare(`
      INSERT INTO call_log (user_id, username, node_num) VALUES (?, ?, ?)
    `).run(userId, username, nodeNum).lastInsertRowid;
  },

  logLogout(logId) {
    db.prepare(`UPDATE call_log SET logout_time = datetime('now') WHERE id = ?`).run(logId);
  },

  getRecent(limit = 20) {
    return db.prepare('SELECT * FROM call_log ORDER BY login_time DESC LIMIT ?').all(limit);
  }
};

// File operations
const files = {
  getByArea(areaId) {
    return db.prepare('SELECT * FROM files WHERE area_id = ? ORDER BY created_at DESC').all(areaId);
  },

  create(areaId, filename, description, size, uploadedBy) {
    return db.prepare(`
      INSERT INTO files (area_id, filename, description, size, uploaded_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(areaId, filename, description, size, uploadedBy);
  },

  incrementDownloads(id) {
    db.prepare('UPDATE files SET download_count = download_count + 1 WHERE id = ?').run(id);
  },

  getTotal() {
    return db.prepare('SELECT COUNT(*) as count FROM files').get().count;
  }
};

// Graffiti wall operations
const graffiti = {
  getRecent(limit = 20) {
    return db.prepare('SELECT * FROM graffiti ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  add(username, message) {
    return db.prepare('INSERT INTO graffiti (username, message) VALUES (?, ?)').run(username, message);
  },
};

// Private mail operations
const privateMail = {
  getInbox(username) {
    return db.prepare('SELECT * FROM private_mail WHERE to_user = ? COLLATE NOCASE ORDER BY created_at DESC').all(username);
  },

  getSent(username) {
    return db.prepare('SELECT * FROM private_mail WHERE from_user = ? COLLATE NOCASE ORDER BY created_at DESC').all(username);
  },

  getById(id) {
    return db.prepare('SELECT * FROM private_mail WHERE id = ?').get(id);
  },

  send(fromUser, toUser, subject, body) {
    return db.prepare('INSERT INTO private_mail (from_user, to_user, subject, body) VALUES (?, ?, ?, ?)').run(fromUser, toUser, subject, body);
  },

  markRead(id) {
    db.prepare('UPDATE private_mail SET read = 1 WHERE id = ?').run(id);
  },

  delete(id) {
    db.prepare('DELETE FROM private_mail WHERE id = ?').run(id);
  },

  countUnread(username) {
    return db.prepare('SELECT COUNT(*) as count FROM private_mail WHERE to_user = ? COLLATE NOCASE AND read = 0').get(username).count;
  },
};

// Poll operations
const polls = {
  getActive() {
    return db.prepare('SELECT * FROM polls WHERE active = 1 ORDER BY created_at DESC').all();
  },

  getAll() {
    return db.prepare('SELECT * FROM polls ORDER BY created_at DESC').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM polls WHERE id = ?').get(id);
  },

  getOptions(pollId) {
    return db.prepare('SELECT * FROM poll_options WHERE poll_id = ? ORDER BY sort_order').all(pollId);
  },

  getResults(pollId) {
    return db.prepare(`
      SELECT po.id, po.option_text, COUNT(pv.id) as votes
      FROM poll_options po
      LEFT JOIN poll_votes pv ON po.id = pv.option_id
      WHERE po.poll_id = ?
      GROUP BY po.id
      ORDER BY po.sort_order
    `).all(pollId);
  },

  hasVoted(pollId, userId) {
    return !!db.prepare('SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?').get(pollId, userId);
  },

  vote(pollId, optionId, userId) {
    return db.prepare('INSERT OR IGNORE INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)').run(pollId, optionId, userId);
  },

  getTotalVotes(pollId) {
    return db.prepare('SELECT COUNT(*) as count FROM poll_votes WHERE poll_id = ?').get(pollId).count;
  },

  create(question, options, author = 'SysOp') {
    const result = db.prepare('INSERT INTO polls (question, author) VALUES (?, ?)').run(question, author);
    const pollId = result.lastInsertRowid;
    for (let i = 0; i < options.length; i++) {
      db.prepare('INSERT INTO poll_options (poll_id, option_text, sort_order) VALUES (?, ?, ?)').run(pollId, options[i], i);
    }
    return pollId;
  },

  toggle(id) {
    db.prepare('UPDATE polls SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  },

  delete(id) {
    db.prepare('DELETE FROM poll_votes WHERE poll_id = ?').run(id);
    db.prepare('DELETE FROM poll_options WHERE poll_id = ?').run(id);
    db.prepare('DELETE FROM polls WHERE id = ?').run(id);
  },
};

// MOTD operations
const motd = {
  getActive() {
    return db.prepare('SELECT * FROM motd WHERE active = 1 ORDER BY created_at DESC LIMIT 1').get();
  },

  getAll() {
    return db.prepare('SELECT * FROM motd ORDER BY created_at DESC').all();
  },

  create(body, author = 'SysOp') {
    return db.prepare('INSERT INTO motd (body, author) VALUES (?, ?)').run(body, author);
  },

  toggle(id) {
    db.prepare('UPDATE motd SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  },

  delete(id) {
    db.prepare('DELETE FROM motd WHERE id = ?').run(id);
  },
};

// Dungeon operations
const dungeon = {
  getPlayer(userId) {
    return db.prepare('SELECT * FROM dungeon_players WHERE user_id = ?').get(userId);
  },

  createPlayer(userId) {
    db.prepare(`
      INSERT OR IGNORE INTO dungeon_players (user_id) VALUES (?)
    `).run(userId);
    return this.getPlayer(userId);
  },

  savePlayer(userId, data) {
    const inventory = typeof data.inventory === 'string' ? data.inventory : JSON.stringify(data.inventory || []);
    db.prepare(`
      UPDATE dungeon_players SET
        hp = ?, max_hp = ?, level = ?, xp = ?, gold = ?,
        attack = ?, defense = ?, room = ?, inventory = ?,
        status = ?, turns_played = ?, monsters_slain = ?,
        deepest_floor = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      data.hp, data.max_hp, data.level, data.xp, data.gold,
      data.attack, data.defense, data.room, inventory,
      data.status, data.turns_played, data.monsters_slain,
      data.deepest_floor, userId
    );
  },

  deletePlayer(userId) {
    db.prepare('DELETE FROM dungeon_players WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM dungeon_history WHERE user_id = ?').run(userId);
  },

  getHistory(userId, limit = 20) {
    return db.prepare(
      'SELECT role, content FROM dungeon_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit).reverse();
  },

  addHistory(userId, role, content) {
    db.prepare(
      'INSERT INTO dungeon_history (user_id, role, content) VALUES (?, ?, ?)'
    ).run(userId, role, content);
    // Keep only last 40 messages to manage context window
    db.prepare(`
      DELETE FROM dungeon_history WHERE user_id = ? AND id NOT IN (
        SELECT id FROM dungeon_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 40
      )
    `).run(userId, userId);
  },

  getLeaderboard(limit = 10) {
    return db.prepare(`
      SELECT dp.*, u.username FROM dungeon_players dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.status != 'dead'
      ORDER BY dp.level DESC, dp.xp DESC, dp.monsters_slain DESC
      LIMIT ?
    `).all(limit);
  }
};

module.exports = { init, users, messages, bulletins, callLog, files, graffiti, privateMail, polls, motd, dungeon, hashPassword, verifyPassword };

const test = require('node:test');
const assert = require('node:assert/strict');

const ansi = require('../src/core/ansi');
const config = require('../config.json');
const packageInfo = require('../package.json');

test('PacketBBS is the primary product identity', () => {
  assert.equal(packageInfo.name, 'packetbbs');
  assert.equal(config.bbsName, 'PacketBBS');
  assert.match(ansi.stripCodes(ansi.art.welcome()), /PacketBBS/);
  assert.doesNotMatch(ansi.stripCodes(ansi.art.welcome()), /VibeBBS/);
});

test('message-base IDs stay stable and Vibe content is grouped as a community section', () => {
  const ids = config.messageBases.map((base) => base.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(config.messageBases.find((base) => base.name === 'Vibe Coding').id, 2);

  const vibeIds = config.messageBases
    .filter((base) => base.section === 'Vibe Community')
    .map((base) => base.id);
  assert.deepEqual(vibeIds, [2, 4]);
});

test('message-base renderer emits section headings without crashing', () => {
  const screen = ansi.stripCodes(ansi.art.messageBases(config.messageBases));
  assert.match(screen, /MAIN BOARD/);
  assert.match(screen, /VIBE COMMUNITY/);
  assert.ok(screen.indexOf('MAIN BOARD') < screen.indexOf('General Discussion'));
  assert.ok(screen.indexOf('VIBE COMMUNITY') < screen.indexOf('Vibe Coding'));
});

test('traditional caller screens fit an 80-column terminal', () => {
  const screens = [
    ansi.art.welcome(),
    ansi.art.mainMenu({
      nodeNum: 1,
      username: 'SysOp',
      callCount: 42,
      unreadMail: 2,
      unreadMessages: 7,
      menuMode: 'NOVICE',
    }),
    ansi.art.logonSummary({
      username: 'SysOp',
      nodeNum: 1,
      lastCall: '2026-08-01 12:00:00',
      previousCaller: 'Another Caller',
      unreadMail: 2,
      unreadMessages: 7,
      newFiles: 1,
      callersSince: 3,
      callsToday: 10,
    }),
    ansi.art.messageBases(config.messageBases),
    ansi.art.messageRead({
      id: 123456789,
      conference: 'A Conference With A Very Long Name That Must Be Truncated',
      date: '2026-08-01 12:00:00 plus extra',
      fromUser: 'A Very Long Caller Handle Beyond The Header Width',
      toUser: 'Everyone With A Long Name',
      subject: 'A long message subject that must stay inside the traditional terminal frame',
      body: 'A long message body line that should wrap at word boundaries and remain inside an eighty-column caller display without losing the words.',
    }),
    ansi.art.lastCallers([{
      username: 'Another Caller',
      login_time: '2026-08-01 12:00:00',
      node_num: 2,
      logout_time: null,
      online: true,
    }]),
  ];

  for (const screen of screens) {
    const lines = ansi.stripCodes(screen).split(/\r?\n/);
    assert.ok(lines.every((line) => line.length <= 80));
    const frameColumns = lines
      .filter((line) => /[┌├└]/.test(line))
      .map((line) => Math.max(line.lastIndexOf('┐'), line.lastIndexOf('┤'), line.lastIndexOf('┘')));
    const frameColumn = Math.max(...frameColumns);
    for (const line of lines.filter((candidate) => candidate.includes('│'))) {
      assert.equal(line.lastIndexOf('│'), frameColumn, `misaligned frame row: ${line}`);
    }
  }
});

test('main menu exposes the classic caller loop and keeps Vibe out of the shell', () => {
  const screen = ansi.stripCodes(ansi.art.mainMenu({ username: 'SysOp', menuMode: 'NOVICE' }));
  assert.match(screen, /Message Conferences/);
  assert.match(screen, /Electronic Mail/);
  assert.match(screen, /New Message Scan/);
  assert.match(screen, /Last Callers/);
  assert.match(screen, /Door Games/);
  assert.doesNotMatch(screen, /Vibe/);
});

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

test('message-base IDs stay stable and Vibe content is grouped as a sub-BBS', () => {
  const ids = config.messageBases.map((base) => base.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(config.messageBases.find((base) => base.name === 'Vibe Coding').id, 2);

  const vibeIds = config.messageBases
    .filter((base) => base.section === 'Vibe Sub-BBS')
    .map((base) => base.id);
  assert.deepEqual(vibeIds, [2, 4]);
});

test('message-base renderer emits section headings without crashing', () => {
  const screen = ansi.stripCodes(ansi.art.messageBases(config.messageBases));
  assert.match(screen, /PACKETBBS BOARDS/);
  assert.match(screen, /VIBE SUB-BBS/);
  assert.ok(screen.indexOf('PACKETBBS BOARDS') < screen.indexOf('General Discussion'));
  assert.ok(screen.indexOf('VIBE SUB-BBS') < screen.indexOf('Vibe Coding'));
});

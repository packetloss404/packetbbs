// ═══════════════════════════════════════════════════════════
// PROMPT QUEST - AI Dungeon Crawler
// (Inspired by Legend of the Red Dragon / LORD)
// Explore procedural dungeons, fight bugs, collect prompts,
// level up your AI companion.
// ═══════════════════════════════════════════════════════════
const ansi = require('../core/ansi');

const MONSTERS = [
  { name: 'Null Pointer', hp: 10, atk: 3, xp: 5, gold: 8, ascii: '  >:(' },
  { name: 'Syntax Gremlin', hp: 15, atk: 5, xp: 8, gold: 12, ascii: ' ~{!}~' },
  { name: 'Race Condition', hp: 20, atk: 7, xp: 12, gold: 18, ascii: '  >><<' },
  { name: 'Memory Leak', hp: 30, atk: 8, xp: 18, gold: 25, ascii: ' [~~~]' },
  { name: 'Infinite Loop', hp: 25, atk: 10, xp: 15, gold: 20, ascii: ' (∞∞∞)' },
  { name: 'Dependency Hell', hp: 40, atk: 12, xp: 25, gold: 35, ascii: ' {⊗⊗⊗}' },
  { name: 'Hallucinating LLM', hp: 50, atk: 15, xp: 35, gold: 50, ascii: ' [◉_◉]' },
  { name: 'Prod Outage Dragon', hp: 80, atk: 20, xp: 60, gold: 100, ascii: ' /\\_/\\' },
];

const WEAPONS = [
  { name: 'Rubber Duck', atk: 2, cost: 0 },
  { name: 'Lint Roller', atk: 5, cost: 30 },
  { name: 'Debugger Wand', atk: 10, cost: 80 },
  { name: 'Refactor Blade', atk: 18, cost: 200 },
  { name: 'CI/CD Cannon', atk: 30, cost: 500 },
  { name: 'Claude Opus Staff', atk: 50, cost: 1200 },
];

const ROOMS = [
  'a dimly lit server room',
  'a corridor of flickering monitors',
  'a vast data center cavern',
  'an abandoned IDE temple',
  'a neon-lit prompt laboratory',
  'a crumbling legacy codebase',
  'a shimmering API gateway',
  'a dark dependency forest',
  'a misty cloud deployment zone',
  'the dreaded production environment',
];

class PromptQuest {
  constructor(session) {
    this.session = session;
    this.player = {
      name: session.user.username,
      hp: 30,
      maxHp: 30,
      atk: 2,
      level: 1,
      xp: 0,
      xpNext: 20,
      gold: 10,
      weapon: WEAPONS[0],
      potions: 2,
      floor: 1,
      kills: 0,
    };
    this.state = 'title';
    this.currentMonster = null;
  }

  write(text) { this.session.write(text); }

  start() {
    this.showTitle();
  }

  showTitle() {
    const r = ansi.reset;
    const g = ansi.brightGreen;
    const y = ansi.brightYellow;
    const m = ansi.brightMagenta;
    const w = ansi.brightWhite;
    const c = ansi.brightCyan;

    this.write(ansi.clear +
`${m}
    ██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗
    ██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝
    ██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║
    ██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║
    ██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║
    ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝
${y}                    ╔═╗ ╦ ╦ ╔═╗ ╔═╗ ╔╦╗
                    ║═╗ ║ ║ ╠═  ╚═╗  ║
                    ╚═╝ ╚═╝ ╚═╝ ╚═╝  ╩${r}

${c}    Descend into the Code Dungeon!
${c}    Fight bugs, collect gold, level up your gear.
${c}    How deep can you go?${r}

`);
    this.state = 'explore';
    this.explore();
  }

  explore() {
    this.state = 'explore';
    const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
    const r = ansi.reset;
    const c = ansi.brightCyan;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const g = ansi.brightGreen;
    const d = ansi.cyan;

    this.write(`\r\n${d}    ─── Floor ${this.player.floor} ───${r}\r\n`);
    this.write(`${c}    You enter ${room}...${r}\r\n\r\n`);

    // Status bar
    this.write(`${g}    HP:${w}${this.player.hp}/${this.player.maxHp}  ${g}Lv:${w}${this.player.level}  ${g}XP:${w}${this.player.xp}/${this.player.xpNext}  ${y}Gold:${w}${this.player.gold}  ${g}Potions:${w}${this.player.potions}${r}\r\n`);
    this.write(`${g}    Weapon: ${w}${this.player.weapon.name} (ATK:${this.player.weapon.atk + this.player.atk})${r}\r\n\r\n`);

    const roll = Math.random();
    if (roll < 0.55) {
      // Monster encounter
      this.monsterEncounter();
    } else if (roll < 0.75) {
      // Find treasure
      const gold = Math.floor(Math.random() * (this.player.floor * 10)) + 5;
      this.write(`${y}    You found a chest containing ${w}${gold} gold${y}!${r}\r\n`);
      this.player.gold += gold;
      this.showExploreMenu();
    } else if (roll < 0.85) {
      // Find potion
      this.write(`${ansi.brightGreen}    You found a Health Potion!${r}\r\n`);
      this.player.potions++;
      this.showExploreMenu();
    } else {
      // Empty room
      this.write(`${c}    The room is empty. You hear distant humming of servers...${r}\r\n`);
      this.showExploreMenu();
    }
  }

  showExploreMenu() {
    const d = ansi.cyan;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const c = ansi.brightCyan;
    const r = ansi.reset;

    this.write(`\r\n${y}    [${w}E${y}]${c}xplore  [${w}D${y}]${c}eeper  [${w}P${y}]${c}otion  [${w}S${y}]${c}hop  [${w}Q${y}]${c}uit${r}\r\n`);
    this.session.prompt('Action: ');
  }

  monsterEncounter() {
    // Scale monster to floor level
    const maxIdx = Math.min(this.player.floor, MONSTERS.length) - 1;
    const idx = Math.floor(Math.random() * (maxIdx + 1));
    const template = MONSTERS[idx];

    const floorScale = 1 + (this.player.floor - 1) * 0.2;
    this.currentMonster = {
      name: template.name,
      hp: Math.floor(template.hp * floorScale),
      maxHp: Math.floor(template.hp * floorScale),
      atk: Math.floor(template.atk * floorScale),
      xp: Math.floor(template.xp * floorScale),
      gold: Math.floor(template.gold * floorScale),
      ascii: template.ascii,
    };

    this.state = 'combat';
    const m = this.currentMonster;
    this.write(`${ansi.brightRed}    ⚔ A ${m.name} appears! ${m.ascii}${ansi.reset}\r\n`);
    this.write(`${ansi.brightRed}    HP: ${m.hp}  ATK: ${m.atk}${ansi.reset}\r\n\r\n`);
    this.showCombatMenu();
  }

  showCombatMenu() {
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const c = ansi.brightCyan;
    const r = ansi.reset;

    this.write(`${y}    [${w}A${y}]${c}ttack  [${w}P${y}]${c}otion  [${w}R${y}]${c}un${r}\r\n`);
    this.session.prompt('Combat: ');
  }

  handleInput(input) {
    const cmd = (input || '').toUpperCase();

    switch (this.state) {
      case 'explore':
        this.handleExplore(cmd);
        break;
      case 'combat':
        this.handleCombat(cmd);
        break;
      case 'shop':
        this.handleShop(cmd);
        break;
      case 'gameover':
        this.session.exitDoor();
        break;
    }
  }

  handleExplore(cmd) {
    switch (cmd) {
      case 'E':
        this.explore();
        break;
      case 'D':
        this.player.floor++;
        this.write(`\r\n${ansi.brightMagenta}    Descending to Floor ${this.player.floor}...${ansi.reset}\r\n`);
        this.explore();
        break;
      case 'P':
        this.usePotion();
        this.showExploreMenu();
        break;
      case 'S':
        this.showShop();
        break;
      case 'Q':
        this.gameOver(false);
        break;
      default:
        this.showExploreMenu();
    }
  }

  handleCombat(cmd) {
    switch (cmd) {
      case 'A':
        this.attack();
        break;
      case 'P':
        this.usePotion();
        // Monster attacks back
        if (this.currentMonster) {
          this.monsterAttack();
        }
        if (this.state === 'combat') this.showCombatMenu();
        break;
      case 'R':
        if (Math.random() < 0.5) {
          this.write(`${ansi.brightGreen}    You escaped!${ansi.reset}\r\n`);
          this.currentMonster = null;
          this.showExploreMenu();
          this.state = 'explore';
        } else {
          this.write(`${ansi.brightRed}    Can't escape!${ansi.reset}\r\n`);
          this.monsterAttack();
          if (this.state === 'combat') this.showCombatMenu();
        }
        break;
      default:
        this.showCombatMenu();
    }
  }

  attack() {
    const playerDmg = Math.floor(Math.random() * (this.player.weapon.atk + this.player.atk)) + 1;
    this.currentMonster.hp -= playerDmg;

    this.write(`${ansi.brightWhite}    You hit ${this.currentMonster.name} for ${playerDmg} damage!${ansi.reset}\r\n`);

    if (this.currentMonster.hp <= 0) {
      this.victory();
      return;
    }

    this.write(`${ansi.cyan}    ${this.currentMonster.name} HP: ${this.currentMonster.hp}/${this.currentMonster.maxHp}${ansi.reset}\r\n`);
    this.monsterAttack();
    if (this.state === 'combat') this.showCombatMenu();
  }

  monsterAttack() {
    const m = this.currentMonster;
    const dmg = Math.floor(Math.random() * m.atk) + 1;
    this.player.hp -= dmg;
    this.write(`${ansi.brightRed}    ${m.name} hits you for ${dmg} damage! (HP: ${this.player.hp}/${this.player.maxHp})${ansi.reset}\r\n`);

    if (this.player.hp <= 0) {
      this.gameOver(true);
    }
  }

  victory() {
    const m = this.currentMonster;
    this.write(`\r\n${ansi.brightGreen}    ★ ${m.name} defeated! +${m.xp}XP +${m.gold}gold${ansi.reset}\r\n`);

    this.player.xp += m.xp;
    this.player.gold += m.gold;
    this.player.kills++;

    // Level up check
    while (this.player.xp >= this.player.xpNext) {
      this.player.xp -= this.player.xpNext;
      this.player.level++;
      this.player.maxHp += 10;
      this.player.hp = this.player.maxHp;
      this.player.atk += 2;
      this.player.xpNext = Math.floor(this.player.xpNext * 1.5);
      this.write(`${ansi.brightYellow}    ★★★ LEVEL UP! You are now level ${this.player.level}! ★★★${ansi.reset}\r\n`);
      this.write(`${ansi.brightGreen}    HP restored! MaxHP:${this.player.maxHp} ATK:${this.player.atk}${ansi.reset}\r\n`);
    }

    this.currentMonster = null;
    this.state = 'explore';
    this.showExploreMenu();
  }

  usePotion() {
    if (this.player.potions <= 0) {
      this.write(`${ansi.brightRed}    No potions left!${ansi.reset}\r\n`);
      return;
    }
    const heal = Math.floor(this.player.maxHp * 0.4);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
    this.player.potions--;
    this.write(`${ansi.brightGreen}    Healed ${heal} HP! (HP: ${this.player.hp}/${this.player.maxHp}) Potions: ${this.player.potions}${ansi.reset}\r\n`);
  }

  showShop() {
    this.state = 'shop';
    const r = ansi.reset;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const c = ansi.brightCyan;
    const g = ansi.brightGreen;
    const d = ansi.cyan;

    let screen = `\r\n${d}    ┌──────────────────────────────────────────────────────┐\r\n`;
    screen += `${d}    │${w}              The Code Armory                          ${d}│\r\n`;
    screen += `${d}    ├──────────────────────────────────────────────────────┤\r\n`;
    screen += `${d}    │  ${y}#   ${w}Weapon               ${c}ATK    ${g}Cost               ${d}│\r\n`;
    screen += `${d}    ├──────────────────────────────────────────────────────┤\r\n`;

    for (let i = 0; i < WEAPONS.length; i++) {
      const w2 = WEAPONS[i];
      const equipped = w2.name === this.player.weapon.name ? ' *' : '  ';
      screen += `${d}    │  ${y}${String(i + 1).padEnd(4)}${w}${(w2.name + equipped).padEnd(21)}${c}${String(w2.atk).padStart(4)}   ${g}${String(w2.cost).padStart(5)}cr            ${d}│\r\n`;
    }

    screen += `${d}    │  ${y}${String(7).padEnd(4)}${w}${'Health Potion'.padEnd(21)}${c}     ${g}${String(25).padStart(5)}cr            ${d}│\r\n`;
    screen += `${d}    ├──────────────────────────────────────────────────────┤\r\n`;
    screen += `${d}    │  ${g}Your Gold: ${w}${this.player.gold}                                    ${d}│\r\n`;
    screen += `${d}    └──────────────────────────────────────────────────────┘${r}\r\n`;

    this.write(screen);
    this.session.prompt('Buy # (Q=quit shop): ');
  }

  handleShop(cmd) {
    if (cmd === 'Q' || !cmd) {
      this.state = 'explore';
      this.showExploreMenu();
      return;
    }

    const idx = parseInt(cmd);
    if (idx === 7) {
      // Buy potion
      if (this.player.gold >= 25) {
        this.player.gold -= 25;
        this.player.potions++;
        this.write(`${ansi.brightGreen}    Bought a Health Potion! (${this.player.potions} total)${ansi.reset}\r\n`);
      } else {
        this.write(`${ansi.brightRed}    Not enough gold!${ansi.reset}\r\n`);
      }
      this.showShop();
      return;
    }

    if (idx < 1 || idx > WEAPONS.length) {
      this.showShop();
      return;
    }

    const weapon = WEAPONS[idx - 1];
    if (this.player.gold < weapon.cost) {
      this.write(`${ansi.brightRed}    Not enough gold!${ansi.reset}\r\n`);
      this.showShop();
      return;
    }

    this.player.gold -= weapon.cost;
    this.player.weapon = weapon;
    this.write(`${ansi.brightGreen}    Equipped ${weapon.name}!${ansi.reset}\r\n`);
    this.showShop();
  }

  gameOver(died) {
    this.state = 'gameover';
    const r = ansi.reset;

    this.write(`\r\n${ansi.brightYellow}    ═══════════════════════════════════════${r}\r\n`);
    if (died) {
      this.write(`${ansi.brightRed}         YOU HAVE BEEN DEFEATED${r}\r\n`);
      this.write(`${ansi.brightRed}    Your code has crashed in production...${r}\r\n`);
    } else {
      this.write(`${ansi.brightGreen}         QUEST COMPLETE${r}\r\n`);
    }
    this.write(`${ansi.brightYellow}    ═══════════════════════════════════════${r}\r\n\r\n`);
    this.write(`${ansi.brightCyan}    Level: ${ansi.brightWhite}${this.player.level}${r}\r\n`);
    this.write(`${ansi.brightCyan}    Floor: ${ansi.brightWhite}${this.player.floor}${r}\r\n`);
    this.write(`${ansi.brightCyan}    Kills: ${ansi.brightWhite}${this.player.kills}${r}\r\n`);
    this.write(`${ansi.brightCyan}    Gold:  ${ansi.brightWhite}${this.player.gold}${r}\r\n`);
    this.write(`${ansi.brightCyan}    Score: ${ansi.brightWhite}${this.player.kills * 10 + this.player.gold + this.player.floor * 50}${r}\r\n\r\n`);
    this.write(`${ansi.pausePrompt}\r\n`);
  }
}

module.exports = PromptQuest;

// ═══════════════════════════════════════════════════════════
// DUNGEON OF THE VIBE LORDS - AI Dungeon Master MUD
// Claude is your DM. The dungeon remembers you.
// Explore procedural rooms, fight monsters, solve puzzles,
// collect loot — all narrated by a live AI dungeon master.
// ═══════════════════════════════════════════════════════════
const Anthropic = require('@anthropic-ai/sdk');
const ansi = require('../core/ansi');
const db = require('../core/database');

const SYSTEM_PROMPT = `You are the Dungeon Master of "Dungeon of the Vibe Lords," a text-based MUD running on a retro BBS (bulletin board system) accessed via telnet terminals. You narrate a dark, witty, developer-themed dungeon crawl.

SETTING: A vast underground complex beneath the ruins of a crashed production server. The dungeon is themed around software engineering — rooms are server rooms, corrupted codebases, dependency forests, cloud caverns, and haunted CI/CD pipelines. Monsters are bugs, runtime errors, and rogue AI processes.

YOUR ROLE:
- Narrate room descriptions, NPC dialogue, combat, puzzles, and events
- Track the game world consistently — remember what happened in previous turns
- Present clear choices but accept freeform player input
- Keep responses SHORT (3-8 lines max) — this is a telnet terminal with limited screen space
- Use evocative but concise language — every word counts on an 80-column display
- Include mechanical outcomes: damage dealt/taken, items found, gold earned, XP gained
- Be fair but dangerous — death should be possible but not cheap

PLAYER STATE (provided each turn as JSON):
You will receive the player's current stats. Use them to calibrate difficulty.
- Reference their level, HP, inventory, and location in your narration
- When the player takes damage, specify the amount (e.g., "The Null Pointer strikes for 8 damage")
- When the player gains XP/gold/items, specify amounts
- Combat damage should scale with player level (enemies hit for ~10-25% of max HP)
- Players heal to full when leveling up

RESPONSE FORMAT:
Reply ONLY with a JSON object (no markdown, no code fences):
{
  "narration": "The room description or event narration text",
  "hp_change": 0,
  "xp_gain": 0,
  "gold_change": 0,
  "items_found": [],
  "items_lost": [],
  "room": "room_id_snake_case",
  "player_died": false,
  "monster_slain": false,
  "floor": 1
}

RULES:
- hp_change is negative for damage, positive for healing
- items_found/items_lost are arrays of item name strings
- room should be a snake_case identifier for the current location
- floor indicates dungeon depth (deeper = harder, more rewarding)
- player_died should be true only if HP would drop to 0 or below
- monster_slain should be true when a monster is killed in combat
- Keep room IDs consistent — if the player returns to "forge_of_refactoring", use that same ID
- XP thresholds: level 2 at 50xp, level 3 at 150xp, level 4 at 350xp, level 5 at 600xp, etc. (each level needs ~50 more XP than the last gap)
- New adventures start in "entrance_hall"
- Include a mix of: exploration, combat encounters, treasure, NPCs, puzzles, and flavor text
- Occasionally reference the BBS/retro computing theme (other callers left graffiti, old sysop messages on walls, etc.)`;

class DungeonOfTheVibeLords {
  constructor(session) {
    this.session = session;
    this.client = null;
    this.player = null;
    this.state = 'title';
    this.conversationHistory = [];
    this.waitingForAI = false;
  }

  write(text) { this.session.write(text); }

  start() {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      this.write(`\r\n${ansi.brightRed}    The Dungeon is sealed! (ANTHROPIC_API_KEY not configured)${ansi.reset}\r\n`);
      this.write(`${ansi.brightYellow}    Ask the SysOp to add the key to .env${ansi.reset}\r\n`);
      this.write(ansi.pausePrompt);
      this.state = 'exit';
      return;
    }

    this.client = new Anthropic();
    this.showTitle();
  }

  showTitle() {
    const r = ansi.reset;
    const c = ansi.brightCyan;
    const y = ansi.brightYellow;
    const m = ansi.brightMagenta;
    const w = ansi.brightWhite;
    const g = ansi.brightGreen;
    const d = ansi.cyan;
    const dr = ansi.red;

    this.write(ansi.clear +
`${dr}
    ██████╗ ██╗   ██╗███╗   ██╗ ██████╗ ███████╗ ██████╗ ███╗   ██╗
    ██╔══██╗██║   ██║████╗  ██║██╔════╝ ██╔════╝██╔═══██╗████╗  ██║
    ██║  ██║██║   ██║██╔██╗ ██║██║  ███╗█████╗  ██║   ██║██╔██╗ ██║
    ██║  ██║██║   ██║██║╚██╗██║██║   ██║██╔══╝  ██║   ██║██║╚██╗██║
    ██████╔╝╚██████╔╝██║ ╚████║╚██████╔╝███████╗╚██████╔╝██║ ╚████║
    ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝
${r}
${m}          ── of the Vibe Lords ──${r}

${d}    ┌──────────────────────────────────────────────────────┐
${d}    │  ${w}An AI-narrated dungeon crawl deep beneath the       ${d}│
${d}    │  ${w}ruins of a crashed production server.               ${d}│
${d}    │                                                      │
${d}    │  ${c}Your Dungeon Master: ${m}Claude${c}, an ancient AI          ${d}│
${d}    │  ${c}bound to the server's dying processes.              ${d}│
${d}    ├──────────────────────────────────────────────────────┤
${d}    │                                                      │
${d}    │  ${y}[${w}N${y}]${g} New Adventure       ${y}[${w}Q${y}]${g} Flee (Quit)            ${d}│\r\n`);

    // Check for existing save
    const existing = db.dungeon.getPlayer(this.session.user.id);
    if (existing && existing.status === 'alive') {
      this.write(
`${d}    │  ${y}[${w}C${y}]${g} Continue Adventure  ${y}[${w}L${y}]${g} Leaderboard            ${d}│\r\n`);
    } else {
      this.write(
`${d}    │                       ${y}[${w}L${y}]${g} Leaderboard            ${d}│\r\n`);
    }

    this.write(
`${d}    │                                                      │
${d}    └──────────────────────────────────────────────────────┘
${r}
`);
    this.session.prompt('Choice: ');
  }

  handleInput(input) {
    if (this.waitingForAI) {
      this.write(`${ansi.brightYellow}    The dungeon stirs... please wait...${ansi.reset}\r\n`);
      return;
    }

    const cmd = (input || '').trim();

    switch (this.state) {
      case 'title':
        this.handleTitle(cmd);
        break;
      case 'playing':
        this.handleCommand(cmd);
        break;
      case 'confirm_new':
        this.handleConfirmNew(cmd);
        break;
      case 'dead':
        this.handleDead(cmd);
        break;
      case 'exit':
        this.session.exitDoor();
        break;
    }
  }

  handleTitle(cmd) {
    switch (cmd.toUpperCase()) {
      case 'N': {
        const existing = db.dungeon.getPlayer(this.session.user.id);
        if (existing && existing.status === 'alive') {
          this.write(`\r\n${ansi.brightYellow}    You have an existing adventure (Level ${existing.level}). Overwrite? [Y/N]${ansi.reset}\r\n`);
          this.state = 'confirm_new';
          this.session.prompt('> ');
          return;
        }
        this.startNewAdventure();
        break;
      }
      case 'C': {
        const existing = db.dungeon.getPlayer(this.session.user.id);
        if (existing && existing.status === 'alive') {
          this.continueAdventure(existing);
        } else {
          this.write(`${ansi.brightRed}    No saved adventure found!${ansi.reset}\r\n`);
          this.session.prompt('Choice: ');
        }
        break;
      }
      case 'L':
        this.showLeaderboard();
        break;
      case 'Q':
        this.session.exitDoor();
        break;
      default:
        this.session.prompt('Choice: ');
    }
  }

  handleConfirmNew(cmd) {
    if (cmd.toUpperCase() === 'Y') {
      db.dungeon.deletePlayer(this.session.user.id);
      this.startNewAdventure();
    } else {
      this.state = 'title';
      this.session.prompt('Choice: ');
    }
  }

  startNewAdventure() {
    this.player = db.dungeon.createPlayer(this.session.user.id);
    this.player.inventory = [];
    this.conversationHistory = [];
    this.state = 'playing';

    this.write(`\r\n${ansi.brightMagenta}    The dungeon awaits, ${this.session.user.username}...${ansi.reset}\r\n\r\n`);

    this.sendToAI('I enter the dungeon for the first time. Describe the entrance hall and what I see.');
  }

  continueAdventure(savedPlayer) {
    this.player = savedPlayer;
    this.player.inventory = JSON.parse(savedPlayer.inventory || '[]');

    // Load conversation history
    this.conversationHistory = db.dungeon.getHistory(this.session.user.id);
    this.state = 'playing';

    this.write(`\r\n${ansi.brightMagenta}    Welcome back, ${this.session.user.username}...${ansi.reset}\r\n\r\n`);

    this.sendToAI(`The player returns to the dungeon. They were last in "${this.player.room}". Briefly remind them where they are and what they can do.`);
  }

  showLeaderboard() {
    const leaders = db.dungeon.getLeaderboard();
    const r = ansi.reset;
    const d = ansi.cyan;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const g = ansi.brightGreen;
    const c = ansi.brightCyan;

    let screen = `\r\n${d}    ┌──────────────────────────────────────────────────────┐\r\n`;
    screen += `${d}    │${w}              Dungeon Hall of Fame                     ${d}│\r\n`;
    screen += `${d}    ├──────────────────────────────────────────────────────┤\r\n`;
    screen += `${d}    │  ${y}Rank  ${w}Adventurer        ${c}Lvl  ${g}Slain  ${y}Floor  ${w}Gold   ${d}│\r\n`;
    screen += `${d}    ├──────────────────────────────────────────────────────┤\r\n`;

    if (leaders.length === 0) {
      screen += `${d}    │  ${w}No adventurers have survived... yet.                ${d}│\r\n`;
    } else {
      for (let i = 0; i < leaders.length; i++) {
        const l = leaders[i];
        const rank = String(i + 1).padEnd(6);
        const name = (l.username || '').padEnd(17);
        const lvl = String(l.level).padStart(3);
        const slain = String(l.monsters_slain).padStart(5);
        const floor = String(l.deepest_floor).padStart(5);
        const gold = String(l.gold).padStart(6);
        screen += `${d}    │  ${y}${rank}${w}${name} ${c}${lvl}  ${g}${slain}  ${y}${floor}  ${w}${gold}   ${d}│\r\n`;
      }
    }

    screen += `${d}    └──────────────────────────────────────────────────────┘${r}\r\n`;
    this.write(screen);
    this.session.prompt('Choice: ');
  }

  handleCommand(cmd) {
    if (!cmd) {
      this.session.prompt('> ');
      return;
    }

    const upper = cmd.toUpperCase();

    // Meta commands
    if (upper === 'QUIT' || upper === 'Q') {
      this.saveAndQuit();
      return;
    }
    if (upper === 'STATS' || upper === 'ST') {
      this.showStats();
      this.session.prompt('> ');
      return;
    }
    if (upper === 'INVENTORY' || upper === 'INV' || upper === 'I') {
      this.showInventory();
      this.session.prompt('> ');
      return;
    }
    if (upper === 'HELP' || upper === 'H' || upper === '?') {
      this.showHelp();
      this.session.prompt('> ');
      return;
    }

    // Everything else goes to Claude
    this.sendToAI(cmd);
  }

  async sendToAI(userInput) {
    this.waitingForAI = true;
    this.write(`${ansi.cyan}    ${this.getLoadingFlavor()}${ansi.reset}\r\n`);

    // Build the player state context
    const playerState = {
      name: this.session.user.username,
      hp: this.player.hp,
      max_hp: this.player.max_hp,
      level: this.player.level,
      xp: this.player.xp,
      gold: this.player.gold,
      attack: this.player.attack,
      defense: this.player.defense,
      room: this.player.room,
      inventory: this.player.inventory,
      turns_played: this.player.turns_played,
      monsters_slain: this.player.monsters_slain,
      deepest_floor: this.player.deepest_floor,
    };

    const userMessage = `[PLAYER STATE: ${JSON.stringify(playerState)}]\n\nPlayer action: ${userInput}`;

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep conversation history manageable (last 20 exchanges)
    if (this.conversationHistory.length > 40) {
      this.conversationHistory = this.conversationHistory.slice(-40);
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: this.conversationHistory,
      });

      const responseText = response.content[0].text;

      // Add assistant response to history
      this.conversationHistory.push({ role: 'assistant', content: responseText });

      // Save to DB
      db.dungeon.addHistory(this.session.user.id, 'user', userMessage);
      db.dungeon.addHistory(this.session.user.id, 'assistant', responseText);

      // Parse the response
      this.processAIResponse(responseText);
    } catch (err) {
      this.waitingForAI = false;
      this.write(`\r\n${ansi.brightRed}    The dungeon's magic falters... (${err.message})${ansi.reset}\r\n`);
      this.session.prompt('> ');
    }
  }

  processAIResponse(responseText) {
    this.waitingForAI = false;

    let data;
    try {
      // Try to extract JSON from the response (handle potential markdown wrapping)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      data = JSON.parse(jsonMatch[0]);
    } catch (e) {
      // If Claude didn't return valid JSON, just show the raw text
      this.renderNarration(responseText);
      this.session.prompt('> ');
      return;
    }

    // Apply state changes
    if (data.hp_change) {
      this.player.hp = Math.min(this.player.max_hp, Math.max(0, this.player.hp + data.hp_change));
    }
    if (data.xp_gain) {
      this.player.xp += data.xp_gain;
      this.checkLevelUp();
    }
    if (data.gold_change) {
      this.player.gold = Math.max(0, this.player.gold + data.gold_change);
    }
    if (data.items_found && data.items_found.length > 0) {
      this.player.inventory.push(...data.items_found);
    }
    if (data.items_lost && data.items_lost.length > 0) {
      for (const item of data.items_lost) {
        const idx = this.player.inventory.indexOf(item);
        if (idx >= 0) this.player.inventory.splice(idx, 1);
      }
    }
    if (data.room) {
      this.player.room = data.room;
    }
    if (data.floor && data.floor > this.player.deepest_floor) {
      this.player.deepest_floor = data.floor;
    }
    if (data.monster_slain) {
      this.player.monsters_slain++;
    }

    this.player.turns_played++;

    // Render the narration
    this.renderNarration(data.narration || responseText);

    // Show status changes
    this.renderStatusChanges(data);

    // Check for death
    if (data.player_died || this.player.hp <= 0) {
      this.player.hp = 0;
      this.player.status = 'dead';
      this.savePlayer();
      this.renderDeath();
      return;
    }

    // Save state
    this.savePlayer();

    // Show mini status bar
    this.renderStatusBar();
    this.session.prompt('> ');
  }

  renderNarration(text) {
    const r = ansi.reset;
    const w = ansi.brightWhite;
    const d = ansi.cyan;

    this.write(`\r\n`);

    // Word-wrap narration to ~60 chars and indent
    const lines = this.wordWrap(text, 56);
    for (const line of lines) {
      this.write(`${d}    │ ${w}${line}${r}\r\n`);
    }
    this.write(`\r\n`);
  }

  renderStatusChanges(data) {
    const r = ansi.reset;

    if (data.hp_change && data.hp_change < 0) {
      this.write(`${ansi.brightRed}    ♥ ${Math.abs(data.hp_change)} damage taken${r}\r\n`);
    }
    if (data.hp_change && data.hp_change > 0) {
      this.write(`${ansi.brightGreen}    ♥ +${data.hp_change} HP restored${r}\r\n`);
    }
    if (data.xp_gain && data.xp_gain > 0) {
      this.write(`${ansi.brightCyan}    * +${data.xp_gain} XP${r}\r\n`);
    }
    if (data.gold_change && data.gold_change > 0) {
      this.write(`${ansi.brightYellow}    $ +${data.gold_change} gold${r}\r\n`);
    }
    if (data.gold_change && data.gold_change < 0) {
      this.write(`${ansi.brightRed}    $ ${data.gold_change} gold${r}\r\n`);
    }
    if (data.items_found && data.items_found.length > 0) {
      for (const item of data.items_found) {
        this.write(`${ansi.brightMagenta}    + Found: ${item}${r}\r\n`);
      }
    }
    if (data.monster_slain) {
      this.write(`${ansi.brightGreen}    x Monster slain!${r}\r\n`);
    }
  }

  renderStatusBar() {
    const r = ansi.reset;
    const d = ansi.cyan;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const g = ansi.brightGreen;
    const red = ansi.brightRed;

    const hpColor = this.player.hp > this.player.max_hp * 0.5 ? g :
                    this.player.hp > this.player.max_hp * 0.25 ? y : red;
    const hpBar = this.makeBar(this.player.hp, this.player.max_hp, 10);

    this.write(
      `${d}    ─── ${hpColor}HP:${hpBar} ${w}${this.player.hp}/${this.player.max_hp}` +
      `  ${y}Lv:${w}${this.player.level}` +
      `  ${y}G:${w}${this.player.gold}` +
      `  ${y}F:${w}${this.player.deepest_floor}` +
      ` ${d}───${r}\r\n`
    );
  }

  makeBar(current, max, width) {
    const filled = Math.round((current / max) * width);
    const empty = width - filled;
    return `${ansi.brightGreen}[${'█'.repeat(filled)}${ansi.brightBlack}${'░'.repeat(empty)}${ansi.brightGreen}]${ansi.reset}`;
  }

  renderDeath() {
    const r = ansi.reset;
    const red = ansi.brightRed;
    const w = ansi.brightWhite;
    const d = ansi.cyan;

    this.write(`\r\n`);
    this.write(`${red}    ╔══════════════════════════════════════════════════╗${r}\r\n`);
    this.write(`${red}    ║                                                  ║${r}\r\n`);
    this.write(`${red}    ║              ${w}YOU HAVE PERISHED${red}                   ║${r}\r\n`);
    this.write(`${red}    ║                                                  ║${r}\r\n`);
    this.write(`${red}    ║  ${d}Level: ${w}${String(this.player.level).padEnd(5)} ${d}Monsters slain: ${w}${String(this.player.monsters_slain).padEnd(5)}   ${red}║${r}\r\n`);
    this.write(`${red}    ║  ${d}Turns: ${w}${String(this.player.turns_played).padEnd(5)} ${d}Deepest floor:  ${w}${String(this.player.deepest_floor).padEnd(5)}   ${red}║${r}\r\n`);
    this.write(`${red}    ║  ${d}Gold:  ${w}${String(this.player.gold).padEnd(5)} ${d}XP earned:      ${w}${String(this.player.xp).padEnd(5)}   ${red}║${r}\r\n`);
    this.write(`${red}    ║                                                  ║${r}\r\n`);
    this.write(`${red}    ╚══════════════════════════════════════════════════╝${r}\r\n\r\n`);
    this.write(`${d}    [${w}N${d}] New adventure  [${w}Q${d}] Return to door games${r}\r\n`);

    this.state = 'dead';
    this.session.prompt('> ');
  }

  handleDead(cmd) {
    switch (cmd.toUpperCase()) {
      case 'N':
        db.dungeon.deletePlayer(this.session.user.id);
        this.startNewAdventure();
        break;
      case 'Q':
      default:
        this.session.exitDoor();
        break;
    }
  }

  checkLevelUp() {
    // XP thresholds: 50, 150, 350, 600, 900, 1250, ...
    const thresholds = [];
    let t = 0;
    let gap = 50;
    for (let i = 0; i < 20; i++) {
      t += gap;
      thresholds.push(t);
      gap += 50;
    }

    const newLevel = thresholds.filter(t => this.player.xp >= t).length + 1;
    if (newLevel > this.player.level) {
      this.player.level = newLevel;
      this.player.max_hp += 10;
      this.player.hp = this.player.max_hp; // Full heal on level up
      this.player.attack += 3;
      this.player.defense += 2;

      this.write(`\r\n${ansi.brightYellow}    ═══════════════════════════════════════${ansi.reset}\r\n`);
      this.write(`${ansi.brightWhite}         LEVEL UP! You are now level ${this.player.level}!${ansi.reset}\r\n`);
      this.write(`${ansi.brightGreen}         HP: ${this.player.max_hp}  ATK: ${this.player.attack}  DEF: ${this.player.defense}${ansi.reset}\r\n`);
      this.write(`${ansi.brightYellow}    ═══════════════════════════════════════${ansi.reset}\r\n\r\n`);
    }
  }

  showStats() {
    const r = ansi.reset;
    const d = ansi.cyan;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const g = ansi.brightGreen;

    this.write(`\r\n${d}    ┌──────────────────────────────────┐${r}\r\n`);
    this.write(`${d}    │ ${w}${this.session.user.username.padEnd(32)} ${d}│${r}\r\n`);
    this.write(`${d}    ├──────────────────────────────────┤${r}\r\n`);
    this.write(`${d}    │ ${y}Level:    ${w}${String(this.player.level).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}HP:       ${w}${(this.player.hp + '/' + this.player.max_hp).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}XP:       ${w}${String(this.player.xp).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}Gold:     ${w}${String(this.player.gold).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}Attack:   ${w}${String(this.player.attack).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}Defense:  ${w}${String(this.player.defense).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}Room:     ${w}${(this.player.room || '?').padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}Floor:    ${w}${String(this.player.deepest_floor).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}Turns:    ${w}${String(this.player.turns_played).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    │ ${y}Slain:    ${w}${String(this.player.monsters_slain).padEnd(22)} ${d}│${r}\r\n`);
    this.write(`${d}    └──────────────────────────────────┘${r}\r\n`);
  }

  showInventory() {
    const r = ansi.reset;
    const d = ansi.cyan;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;

    this.write(`\r\n${d}    ┌──────────────────────────────────┐${r}\r\n`);
    this.write(`${d}    │ ${w}Inventory                          ${d}│${r}\r\n`);
    this.write(`${d}    ├──────────────────────────────────┤${r}\r\n`);

    if (!this.player.inventory || this.player.inventory.length === 0) {
      this.write(`${d}    │ ${y}(empty)                            ${d}│${r}\r\n`);
    } else {
      for (const item of this.player.inventory) {
        this.write(`${d}    │ ${y}* ${w}${item.padEnd(30)} ${d}│${r}\r\n`);
      }
    }

    this.write(`${d}    └──────────────────────────────────┘${r}\r\n`);
  }

  showHelp() {
    const r = ansi.reset;
    const d = ansi.cyan;
    const y = ansi.brightYellow;
    const w = ansi.brightWhite;
    const g = ansi.brightGreen;

    this.write(`\r\n${d}    ┌──────────────────────────────────────────────────────┐${r}\r\n`);
    this.write(`${d}    │ ${w}Dungeon Commands                                      ${d}│${r}\r\n`);
    this.write(`${d}    ├──────────────────────────────────────────────────────┤${r}\r\n`);
    this.write(`${d}    │ ${g}Type anything!${w} Claude is your DM. Try:               ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}"look around"       ${w}Examine your surroundings       ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}"go north"          ${w}Move in a direction             ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}"attack the bug"    ${w}Fight a monster                 ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}"search the room"   ${w}Look for hidden items           ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}"talk to the NPC"   ${w}Start a conversation            ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}"use healing potion" ${w}Use an inventory item          ${d}│${r}\r\n`);
    this.write(`${d}    ├──────────────────────────────────────────────────────┤${r}\r\n`);
    this.write(`${d}    │ ${g}Quick commands:                                       ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}STATS / ST  ${w}View your character stats               ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}INV / I     ${w}Check your inventory                    ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}HELP / ?    ${w}Show this help screen                   ${d}│${r}\r\n`);
    this.write(`${d}    │  ${y}QUIT / Q    ${w}Save and return to door games           ${d}│${r}\r\n`);
    this.write(`${d}    └──────────────────────────────────────────────────────┘${r}\r\n`);
  }

  savePlayer() {
    db.dungeon.savePlayer(this.session.user.id, this.player);
  }

  saveAndQuit() {
    this.savePlayer();
    this.write(`\r\n${ansi.brightGreen}    Adventure saved. The dungeon will remember you...${ansi.reset}\r\n`);
    this.write(`${ansi.brightCyan}    Level ${this.player.level} | ${this.player.hp}/${this.player.max_hp} HP | ${this.player.gold} gold | Floor ${this.player.deepest_floor}${ansi.reset}\r\n\r\n`);
    this.session.exitDoor();
  }

  wordWrap(text, maxWidth) {
    const lines = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        if (currentLine.length + word.length + 1 > maxWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    return lines;
  }

  getLoadingFlavor() {
    const flavors = [
      'The dungeon stirs...',
      'Ancient processes awaken...',
      'The DM consults the source code...',
      'Compiling reality...',
      'Rolling virtual dice...',
      'Querying the abyss...',
      'The server room hums...',
      'Parsing your fate...',
      'Allocating dungeon memory...',
      'Resolving dependencies of doom...',
    ];
    return flavors[Math.floor(Math.random() * flavors.length)];
  }
}

module.exports = DungeonOfTheVibeLords;

# VibeBBS

```
██╗   ██╗██╗██████╗ ███████╗██████╗ ██████╗ ███████╗
██║   ██║██║██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝
██║   ██║██║██████╔╝█████╗  ██████╔╝██████╔╝███████╗
╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██╔══██╗██╔══██╗╚════██║
 ╚████╔╝ ██║██████╔╝███████╗██████╔╝██████╔╝███████║
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═════╝ ╚═════╝ ╚══════╝
```

**A retro Bulletin Board System for the Vibe Coding era.**

VibeBBS brings back the magic of 1980s/90s BBSes — ANSI art, door games, message bases, file areas — with a modern hybrid architecture. Connect via Telnet for the authentic experience or through your browser with a full terminal emulator. Built for the vibe coding community.

---

## Features

- **Hybrid Access** — Telnet server + browser-based web terminal (xterm.js) with CRT scanline effect
- **Multi-Node** — Up to 16 simultaneous users with real-time login/logout broadcasts
- **ANSI Art UI** — Full-color retro interface with box drawing, gradients, and block art throughout
- **Message Bases** — 5 threaded conferences with unread tracking and access control
- **File Areas** — 4 download areas for sharing scripts, prompts, CLAUDE.md files, and ANSI art
- **5 Door Games** — Including an AI Dungeon Master MUD powered by Claude
- **SysOp Admin Panel** — Web-based dashboard for managing users, messages, bulletins, and nodes
- **Persistent Storage** — SQLite database with scrypt-hashed passwords and call logging

## Quick Start

```bash
git clone git@github.com:packetloss404/vibebbs.git
cd vibebbs
cp .env.example .env        # Add your ANTHROPIC_API_KEY for the AI Dungeon
npm install
npm start
```

Then connect:

| Method | Address |
|--------|---------|
| Web Terminal | http://localhost:8088 |
| Admin Panel | http://localhost:8088/admin |
| Telnet | `telnet localhost 2323` |

**Default login:** `SysOp` / `sysop`

## Screenshots (What You'll See)

VibeBBS renders entirely in ANSI art. Here's what the flow looks like:

```
┌──────────────────────────────────────────────────────┐
│  A Bulletin Board System for the Vibe Coding Era     │
│  Where retro meets the future of AI-assisted code    │
└──────────────────────────────────────────────────────┘

    Enter your credentials below
    or type NEW to register

    Username: _
```

The main menu provides access to all BBS functions:

```
┌──────────────────────────────────────────────────────┐
│  [M] Message Bases        [W] Who's Online           │
│  [F] File Areas           [U] User Settings          │
│  [D] Door Games           [P] Page SysOp             │
│  [B] Bulletins            [S] System Stats           │
│  [C] Chat Rooms           [G] Goodbye / Logoff       │
└──────────────────────────────────────────────────────┘
```

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐
│ Telnet :2323 │────▶│                                      │
└─────────────┘     │   BBSSession (State Machine)         │
                    │                                      │
┌─────────────┐     │   27 states: login, menus, messages, │──▶ SQLite DB
│ Browser :8088│────▶│   files, doors, admin, settings...   │
│  (WebSocket) │     │                                      │
└─────────────┘     └──────────────────────────────────────┘
                              │
┌─────────────┐               │
│ Admin Panel  │───────────────┘
│  (REST API)  │     Express routes + token auth
└─────────────┘
```

Both Telnet and WebSocket connections share the same session engine. The `NodeManager` tracks all active nodes across both transport types, enabling cross-protocol broadcasts.

## Message Bases

| # | Conference | Description | Access |
|---|-----------|-------------|--------|
| 1 | General Discussion | Chat about anything and everything | All users |
| 2 | Vibe Coding | Share your vibe coding sessions & tips | All users |
| 3 | Show & Tell | Show off what you built with AI | All users |
| 4 | Prompt Engineering | Discuss prompts, CLAUDE.md files, and workflows | All users |
| 5 | SysOp Corner | System administration discussion | SysOp only |

Messages support threading (replies), per-user read tracking, and writing with `/S` to save and `/A` to abort.

## File Areas

| # | Area | Description |
|---|------|-------------|
| 1 | Scripts & Tools | Useful scripts and utilities |
| 2 | CLAUDE.md Collection | Curated CLAUDE.md files |
| 3 | Prompt Libraries | Prompt collections and templates |
| 4 | ANSI Art | ANSI art files and packs |

## Door Games

### 🚀 Vibe Wars
*Inspired by TradeWars 2002*

Intergalactic AI resource trading across 8 sectors. Buy and sell GPU Cores, Training Data, Model Weights, API Tokens, Prompt Packs, and VRAM Chips. Navigate pirate encounters, manage fuel and cargo, and maximize your fortune in 30 turns.

### ⚔️ Prompt Quest
*Inspired by Legend of the Red Dragon*

Dungeon crawler where you descend through procedurally generated floors fighting dev bugs — from Null Pointers to the dreaded Prod Outage Dragon. Earn gold, buy weapons (Rubber Duck → Claude Opus Staff), level up, and see how deep you can go.

### 💰 Token Tycoon
*Original*

Build an AI startup from $5,000 to IPO in 24 months. Hire engineers, buy compute, train models, run marketing campaigns, and acquire customers. Random events like viral tweets, angel investors, and AWS bill surprises keep every playthrough different. Graded S through F on final valuation.

### 📚 Stack Overflow
*Original*

Developer-themed hangman with 80 words across four categories: Programming Languages, Frameworks & Tools, Dev Concepts, and AI & Vibe Coding. Guess the word before your stack overflows (6 wrong = crash). Multi-round scoring with running win rate.

### 🧠 Dungeon of the Vibe Lords
*AI-Powered MUD — Claude is your Dungeon Master*

A live AI-narrated dungeon crawl beneath the ruins of a crashed production server. Claude acts as your Dungeon Master, generating room descriptions, NPC dialogue, combat encounters, puzzles, and loot — all in real-time over a telnet terminal.

**What makes it special:**
- **Freeform input** — Type anything. "Search the corpse," "bribe the goblin," "cast a mass rollback on the corrupted database." Claude handles it all.
- **Persistent characters** — Your adventure saves to the database. Log off, come back tomorrow, and the dungeon remembers you. Conversation history is preserved so Claude maintains narrative continuity.
- **Full RPG mechanics** — HP, XP, gold, attack, defense, inventory, leveling with stat growth and full heals. Death is permanent (roguelike).
- **Dev-themed world** — Rooms are server rooms, corrupted codebases, and haunted CI/CD pipelines. Monsters are race conditions, memory leaks, and hallucinating LLMs. Loot is mechanical keyboards and ancient documentation scrolls.
- **Leaderboard** — Hall of Fame ranked by level, monsters slain, and deepest floor reached.

Requires `ANTHROPIC_API_KEY` in `.env` (see `.env.example`). Without it, the dungeon entrance displays a "sealed" message.

## Admin Panel

The SysOp admin panel is a web-based dashboard at `/admin` with a retro green-on-black terminal aesthetic.

- **Dashboard** — Live stats (users, messages, calls, uptime), online nodes, recent call log
- **User Management** — List, delete, reset passwords, edit access levels
- **Message Management** — Browse by conference, delete individual messages
- **Bulletin Management** — Create, toggle active/inactive, delete announcements
- **Node Monitoring** — Real-time view of who's online and what they're doing

Authentication requires SysOp credentials (access level ≥ 200).

## Configuration

BBS settings live in `config.json`, API keys in `.env`:

```json
{
  "bbsName": "VibeBBS",
  "sysopName": "SysOp",
  "telnetPort": 2323,
  "webPort": 8088,
  "maxNodes": 16,
  "allowNewUsers": true,
  "idleTimeout": 300,
  "messageBases": [ ... ],
  "fileAreas": [ ... ]
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `telnetPort` | 2323 | Telnet server port |
| `webPort` | 8088 | Web terminal & admin panel port |
| `maxNodes` | 16 | Maximum simultaneous connections |
| `allowNewUsers` | true | Allow new user registration |
| `idleTimeout` | 300 | Seconds before idle disconnect |
| `newUserLevel` | 10 | Access level for new accounts |
| `sysopLevel` | 255 | Maximum access level |

**Environment variables** (`.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | For Door 5 | Claude API key for the AI Dungeon Master |

## Database

VibeBBS uses SQLite (stored at `data/vibebbs.db`, gitignored). The schema is auto-created on first run and includes:

- **users** — Accounts with scrypt-hashed passwords, access levels, and stats
- **messages** — Threaded messages organized by conference
- **message_read** — Per-user read tracking for unread counts
- **bulletins** — SysOp announcements with active/inactive toggle
- **files** — File metadata with download counts
- **call_log** — Login/logout history per node
- **dungeon_players** — Persistent MUD character state (HP, inventory, level, room, stats)
- **dungeon_history** — Conversation history with Claude for narrative continuity

The default SysOp account and welcome content are seeded automatically on first launch.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Database | SQLite via better-sqlite3 |
| Web Server | Express |
| WebSocket | ws |
| Web Terminal | xterm.js v5.5.0 |
| Auth | scrypt (Node.js crypto) |
| Protocol | Telnet (raw TCP) |
| AI (Door 5) | Anthropic Claude API |

## Project Structure

```
vibebbs/
├── server.js                  # Entry point — starts all servers
├── config.json                # BBS configuration
├── .env                       # API keys (gitignored)
├── .env.example               # Template for .env
├── package.json
├── src/
│   ├── core/
│   │   ├── ansi.js            # ANSI escape codes & art screens
│   │   ├── bbs.js             # Session state machine (27 states)
│   │   └── database.js        # SQLite schema & CRUD operations
│   ├── server/
│   │   ├── telnet.js          # Telnet server
│   │   ├── websocket.js       # WebSocket server
│   │   └── node-manager.js    # Multi-node connection tracking
│   ├── doors/
│   │   ├── door1.js           # Vibe Wars (trading game)
│   │   ├── door2.js           # Prompt Quest (dungeon crawler)
│   │   ├── door3.js           # Token Tycoon (startup sim)
│   │   ├── door4.js           # Stack Overflow (hangman)
│   │   └── door5.js           # Dungeon of the Vibe Lords (AI MUD)
│   ├── admin/
│   │   └── panel.js           # SysOp web admin panel
│   └── web/
│       └── index.html         # Browser terminal (xterm.js)
└── data/                      # SQLite database (gitignored)
```

## License

MIT

---

*Built with vibes by [packetloss404](https://github.com/packetloss404). Keep vibing.*

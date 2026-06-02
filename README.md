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

VibeBBS brings back the magic of 1980s/90s BBSes — ANSI art, door games, message bases, private mail, polls, a graffiti wall — with a modern hybrid architecture. Connect via Telnet for the authentic experience or through your browser with a full terminal emulator. Both transports feed one shared session engine, so 16 nodes across both protocols see each other in real time. Built for the vibe coding community.

---

## Features

- **Hybrid Access** — Raw Telnet server (TCP 2323, real IAC negotiation) + browser web terminal (xterm.js over WebSocket) with CRT scanline effect, both driving one `BBSSession` engine
- **Multi-Node Concurrency** — Up to 16 simultaneous users with cross-protocol broadcasts: login/logout/disconnect notices, SysOp pages, and new-mail alerts reach online users regardless of how they connected
- **ANSI Art UI** — Full-color retro interface with box drawing, gradients, and block art throughout (~40-state ANSI session machine, hand-written byte-level input parsing including backspace and Telnet IAC)
- **Message Bases** — 5 threaded conferences with reply chains, per-user unread tracking (`message_read` join table), access-level gating, and a `/S` save / `/A` abort multi-line editor
- **Private Mail** — Person-to-person mail with inbox/read/reply/delete, recipient validation, unread badges on login, and live "new mail" push if the recipient is currently online
- **Polls & Voting Booth** — Interactive polls with one-vote-per-user enforcement (DB-level unique constraint) and results rendered as percentage ASCII bar charts
- **Live Multi-Room Chat** — 3 chat rooms with real cross-node message relay scoped per room, join/leave announcements, and `/W` who's-here
- **Graffiti Wall** — Tag the wall; usernames are ANSI-stripped before display
- **4 Door Games** — Two classic-inspired ports and two originals, all vibe-coding themed, all complete with scoring and win/lose conditions
- **SysOp Tools** — MOTD-on-login, SysOp paging (blinking alert to every level-200+ node), who's-online, system stats, and a token-authenticated web admin dashboard
- **File Areas** — 4 browsable catalog areas for scripts, prompts, CLAUDE.md files, and ANSI art (listing/catalog; transfer not yet wired)
- **Persistent Storage** — SQLite (better-sqlite3, WAL mode, 11 tables) with scrypt-hashed passwords and call logging

## Quick Start

```bash
git clone git@github.com:packetloss404/vibebbs.git
cd vibebbs
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
│  [M] Message Bases        [E] Private Mail           │
│  [F] File Areas           [V] Polls / Voting Booth   │
│  [D] Door Games           [R] Graffiti Wall          │
│  [B] Bulletins            [W] Who's Online           │
│  [C] Chat Rooms           [U] User Settings          │
│  [P] Page SysOp           [S] System Stats           │
│                           [G] Goodbye / Logoff       │
└──────────────────────────────────────────────────────┘
```

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐
│ Telnet :2323 │────▶│                                      │
└─────────────┘     │   BBSSession (State Machine)         │
                    │                                      │
┌─────────────┐     │   ~40 states: login, menus, messages,│──▶ SQLite DB
│ Browser :8088│────▶│   mail, polls, chat, doors, admin... │
│  (WebSocket) │     │                                      │
└─────────────┘     └──────────────────────────────────────┘
                              │
┌─────────────┐               │
│ Admin Panel  │───────────────┘
│  (REST API)  │     Express routes + token auth
└─────────────┘
```

Both Telnet and WebSocket connections construct the same `BBSSession` over a tiny `transport` shim (`write`/`end`). Telnet sends real IAC negotiation bytes (`WILL ECHO`, `WILL/DO SUPPRESS-GO-AHEAD`) and parses raw input byte-by-byte; WebSocket adds ping/pong keepalive for idle timeout. The `NodeManager` tracks every active node across both transports as a `node → {session, username, activity}` map and provides `broadcast()`, which powers cross-protocol login/logout/paging/new-mail announcements.

## Message Bases

| # | Conference | Description | Access |
|---|-----------|-------------|--------|
| 1 | General Discussion | Chat about anything and everything | All users |
| 2 | Vibe Coding | Share your vibe coding sessions & tips | All users |
| 3 | Show & Tell | Show off what you built with AI | All users |
| 4 | Prompt Engineering | Discuss prompts, CLAUDE.md files, and workflows | All users |
| 5 | SysOp Corner | System administration discussion | SysOp only |

Messages support threading (replies), per-user read tracking via the `message_read` join table, access-level gating per conference, and writing with `/S` to save and `/A` to abort.

## Private Mail

Person-to-person messaging backed by a dedicated `private_mail` table:

- Send, inbox, read, reply, and delete
- Recipient existence validation with canonical casing
- Unread counts surfaced as a badge on login
- Real-time "you've got mail" push when the recipient is online on any node

## Polls / Voting Booth

An interactive voting subsystem (`polls`, `poll_options`, `poll_votes` tables):

- One vote per user, enforced by a `UNIQUE(poll_id, user_id)` constraint
- Live results rendered as percentage ASCII bar charts
- Ships with a seeded sample poll on first run

## Chat Rooms & Graffiti

- **Live Chat** — 3 rooms with real-time cross-node message relay scoped to the room you're in, plus join/leave announcements and `/W` to see who's present.
- **Graffiti Wall** — Leave a tag on the wall, seeded with starter messages. Usernames are ANSI-stripped before rendering so nobody can break the layout.

## File Areas

| # | Area | Description |
|---|------|-------------|
| 1 | Scripts & Tools | Useful scripts and utilities |
| 2 | CLAUDE.md Collection | Curated CLAUDE.md files |
| 3 | Prompt Libraries | Prompt collections and templates |
| 4 | ANSI Art | ANSI art files and packs |

> Note: file areas are browsable catalogs (listing + metadata). Actual upload/download transfer is not yet wired.

## Door Games

### 🚀 Vibe Wars
*Inspired by TradeWars 2002*

Intergalactic AI resource trading across 8 sectors with a per-sector price model and volatility. Buy and sell GPU Cores, Training Data, Model Weights, API Tokens, Prompt Packs, and VRAM Chips. Navigate probabilistic pirate encounters, manage fuel, cargo, and hull, and maximize your fortune in 30 turns with end-of-game scoring.

### ⚔️ Prompt Quest
*Inspired by Legend of the Red Dragon*

Dungeon crawler where you descend through floors fighting 8 scaling dev-bug monsters — from Null Pointers to the dreaded Prod Outage Dragon. Earn XP and gold, level up, buy weapons (Rubber Duck → Claude Opus Staff) and potions, and see how deep you can go.

### 💰 Token Tycoon
*Original*

Build an AI startup from $5,000 to IPO in 24 months. Hire engineers, buy compute, train models, run marketing campaigns, and acquire customers via real revenue/cost formulas. Random events like viral tweets, angel investors, and AWS bill surprises keep every playthrough different. Graded S through F on final valuation.

### 📚 Stack Overflow
*Original*

Developer-themed hangman with 80 words across four categories: Programming Languages, Frameworks & Tools, Dev Concepts, and AI & Vibe Coding. Guess the word before your stack overflows (6 wrong = crash). Multi-round scoring with running win rate.

## Admin Panel

The SysOp admin panel is a web-based single-file vanilla-JS SPA at `/admin` with a retro green-on-black terminal aesthetic, served by Express with token auth (`/admin/api/*` routes gated by a `requireAuth` middleware; login requires access level ≥ 200).

- **Dashboard** — Live stats (users, messages, calls, uptime), online nodes, recent call log
- **User Management** — List, delete, reset passwords, edit access levels (password hashes stripped from API responses)
- **Message Management** — Browse by conference, delete individual messages
- **Bulletin Management** — Create, toggle active/inactive, delete announcements
- **Node Monitoring** — Real-time view of who's online and what they're doing

## Configuration

All settings live in `config.json`:

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

## Database

VibeBBS uses SQLite (better-sqlite3 in WAL mode, stored at `data/vibebbs.db`, gitignored). The 11-table schema is auto-created and seeded on first run via namespaced CRUD modules over prepared statements:

- **users** — Accounts with scrypt-hashed passwords (per-user salt), access levels, and stats
- **messages** — Threaded messages organized by conference
- **message_read** — Per-user read tracking for unread counts
- **bulletins** — SysOp announcements with active/inactive toggle
- **files** — File metadata with download counts
- **call_log** — Login/logout history per node
- **graffiti** — Graffiti wall entries
- **private_mail** — Person-to-person mail with read/unread state
- **polls**, **poll_options**, **poll_votes** — Polls, their choices, and one-vote-per-user records
- **motd** — Message of the day shown on login

The default SysOp account, welcome content, a sample poll, MOTD, and starter graffiti are seeded automatically on first launch.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Database | SQLite via better-sqlite3 (WAL) |
| Web Server | Express |
| WebSocket | ws |
| Web Terminal | xterm.js v5.5.0 |
| Auth | scrypt (Node.js crypto) |
| Protocol | Telnet (raw TCP via `net`) |

Three runtime dependencies, zero build step.

## Project Structure

```
vibebbs/
├── server.js                  # Entry point — starts all servers
├── config.json                # BBS configuration
├── package.json
├── src/
│   ├── core/
│   │   ├── ansi.js            # ANSI escape codes & art screens
│   │   ├── bbs.js             # Session state machine (~40 states)
│   │   └── database.js        # SQLite schema & CRUD (11 tables)
│   ├── server/
│   │   ├── telnet.js          # Telnet server (raw TCP + IAC)
│   │   ├── websocket.js       # WebSocket server
│   │   └── node-manager.js    # Multi-node connection tracking
│   ├── doors/
│   │   ├── door1.js           # Vibe Wars (trading game)
│   │   ├── door2.js           # Prompt Quest (dungeon crawler)
│   │   ├── door3.js           # Token Tycoon (startup sim)
│   │   └── door4.js           # Stack Overflow (hangman)
│   ├── admin/
│   │   └── panel.js           # SysOp web admin panel (Express + embedded SPA)
│   └── web/
│       └── index.html         # Browser terminal (xterm.js)
└── data/                      # SQLite database (gitignored)
```

## License

MIT

---

*Built with vibes by [packetloss404](https://github.com/packetloss404). Keep vibing.*

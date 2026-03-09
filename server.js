// ═══════════════════════════════════════════════════════════
//  VibeBBS - A Bulletin Board System for the Vibe Coding Era
//  Hybrid Telnet + Web Terminal | Multi-Node | Persistent
// ═══════════════════════════════════════════════════════════

const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('./config.json');
const db = require('./src/core/database');
const NodeManager = require('./src/server/node-manager');
const { createTelnetServer } = require('./src/server/telnet');
const { createWebSocketServer } = require('./src/server/websocket');
const { setupAdminPanel } = require('./src/admin/panel');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Ensure file area directories exist
for (const area of config.fileAreas) {
  const areaPath = path.join(__dirname, area.path);
  if (!fs.existsSync(areaPath)) fs.mkdirSync(areaPath, { recursive: true });
}

// Initialize database
db.init();

// Create node manager
const nodeManager = new NodeManager(config.maxNodes);

// ─── Express app (serves web terminal + admin panel) ────
const app = express();

// Serve the web terminal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'web', 'index.html'));
});

// Setup admin panel routes
setupAdminPanel(app, nodeManager, config);

// ─── HTTP server (for WebSocket upgrade + web terminal) ──
const httpServer = http.createServer(app);

// ─── WebSocket server ────────────────────────────────────
createWebSocketServer(httpServer, nodeManager, config);

// ─── Telnet server ───────────────────────────────────────
const telnetServer = createTelnetServer(nodeManager, config);

// ─── Start everything ────────────────────────────────────
const startTime = Date.now();

telnetServer.listen(config.telnetPort, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║                                                  ║');
  console.log('  ║   ██╗   ██╗██╗██████╗ ███████╗██████╗ ██████╗   ║');
  console.log('  ║   ██║   ██║██║██╔══██╗██╔════╝██╔══██╗██╔═══╝   ║');
  console.log('  ║   ╚██╗ ██╔╝██║██████╔╝█████╗  ██████╔╝╚████╗   ║');
  console.log('  ║    ╚████╔╝ ██║██╔══██╗██╔══╝  ██╔══██╗ ╚═══██╗ ║');
  console.log('  ║     ╚██╔╝  ██║██████╔╝███████╗██████╔╝██████╔╝  ║');
  console.log('  ║      ╚═╝   ╚═╝╚═════╝ ╚══════╝╚═════╝ ╚═════╝  ║');
  console.log('  ║                                                  ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Telnet server listening on port ${config.telnetPort}`);
});

httpServer.listen(config.webPort, () => {
  console.log(`  Web terminal:  http://localhost:${config.webPort}`);
  console.log(`  Admin panel:   http://localhost:${config.webPort}/admin`);
  console.log(`  Telnet:        telnet localhost ${config.telnetPort}`);
  console.log('');
  console.log(`  Max nodes: ${config.maxNodes}`);
  console.log(`  SysOp: ${config.sysopName}`);
  console.log(`  Default user: SysOp / sysop`);
  console.log('');
  console.log('  VibeBBS is online. Keep vibing!');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n  Shutting down VibeBBS...');
  telnetServer.close();
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n  Shutting down VibeBBS...');
  telnetServer.close();
  httpServer.close();
  process.exit(0);
});

// ANSI escape code utilities and art for VibeBBS

const ESC = '\x1b';
const CSI = `${ESC}[`;

const ansi = {
  // Screen control
  clear: `${CSI}2J${CSI}1;1H`,
  home: `${CSI}1;1H`,
  saveCursor: `${CSI}s`,
  restoreCursor: `${CSI}u`,
  hideCursor: `${CSI}?25l`,
  showCursor: `${CSI}?25h`,

  // Cursor movement
  up: (n = 1) => `${CSI}${n}A`,
  down: (n = 1) => `${CSI}${n}B`,
  right: (n = 1) => `${CSI}${n}C`,
  left: (n = 1) => `${CSI}${n}D`,
  goto: (row, col) => `${CSI}${row};${col}H`,
  eraseLine: `${CSI}2K`,

  // Colors
  reset: `${CSI}0m`,
  bold: `${CSI}1m`,
  dim: `${CSI}2m`,
  blink: `${CSI}5m`,
  reverse: `${CSI}7m`,

  // Foreground colors
  black: `${CSI}30m`,
  red: `${CSI}31m`,
  green: `${CSI}32m`,
  yellow: `${CSI}33m`,
  blue: `${CSI}34m`,
  magenta: `${CSI}35m`,
  cyan: `${CSI}36m`,
  white: `${CSI}37m`,

  // Bright foreground
  brightBlack: `${CSI}90m`,
  brightRed: `${CSI}91m`,
  brightGreen: `${CSI}92m`,
  brightYellow: `${CSI}93m`,
  brightBlue: `${CSI}94m`,
  brightMagenta: `${CSI}95m`,
  brightCyan: `${CSI}96m`,
  brightWhite: `${CSI}97m`,

  // Background colors
  bgBlack: `${CSI}40m`,
  bgRed: `${CSI}41m`,
  bgBlue: `${CSI}44m`,
  bgCyan: `${CSI}46m`,
  bgWhite: `${CSI}47m`,

  // Helpers
  color: (fg, bg) => {
    let code = `${CSI}${fg}`;
    if (bg !== undefined) code += `;${bg}`;
    return code + 'm';
  },

  // Draw a horizontal line
  hline: (width, char = '─') => char.repeat(width),

  // Draw a box
  box: (width, height, title = '') => {
    let result = '┌';
    if (title) {
      result += '┤ ' + title + ' ├';
      result += '─'.repeat(Math.max(0, width - title.length - 6));
    } else {
      result += '─'.repeat(width - 2);
    }
    result += '┐\r\n';
    for (let i = 0; i < height - 2; i++) {
      result += '│' + ' '.repeat(width - 2) + '│\r\n';
    }
    result += '└' + '─'.repeat(width - 2) + '┘\r\n';
    return result;
  },

  // Center text in a given width
  center: (text, width) => {
    const stripped = ansi.stripCodes(text);
    const pad = Math.max(0, Math.floor((width - stripped.length) / 2));
    return ' '.repeat(pad) + text;
  },

  // Strip ANSI codes from text (for length calculations)
  stripCodes: (text) => text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ''),

  // Pause prompt
  pausePrompt: `\r\n${CSI}96m── ${CSI}97mPress any key to continue ${CSI}96m──${CSI}0m`,

  // More prompt for paging
  morePrompt: `${CSI}96m── ${CSI}97m[C]ontinue, [S]top, [N]onstop ${CSI}96m──${CSI}0m`,
};

// ═══════════════════════════════════════════════════════════════
// ANSI Art Screens
// ═══════════════════════════════════════════════════════════════

ansi.art = {};

ansi.art.welcome = () => {
  const r = ansi.reset;
  const c = ansi.brightCyan;
  const m = ansi.brightMagenta;
  const y = ansi.brightYellow;
  const w = ansi.brightWhite;
  const g = ansi.brightGreen;
  const d = ansi.cyan;
  const dm = ansi.magenta;

  return ansi.clear +
`${d}
${c}    ██╗   ██╗${m}██╗${y}██████╗ ${g}███████╗${w}██████╗ ${c}██████╗ ${m}███████╗
${c}    ██║   ██║${m}██║${y}██╔══██╗${g}██╔════╝${w}██╔══██╗${c}██╔══██╗${m}██╔════╝
${c}    ██║   ██║${m}██║${y}██████╔╝${g}█████╗  ${w}██████╔╝${c}██████╔╝${m}███████╗
${c}    ╚██╗ ██╔╝${m}██║${y}██╔══██╗${g}██╔══╝  ${w}██╔══██╗${c}██╔══██╗${m}╚════██║
${c}     ╚████╔╝ ${m}██║${y}██████╔╝${g}███████╗${w}██████╔╝${c}██████╔╝${m}███████║
${c}      ╚═══╝  ${m}╚═╝${y}╚═════╝ ${g}╚══════╝${w}╚═════╝ ${c}╚═════╝ ${m}╚══════╝
${r}
${d}    ┌──────────────────────────────────────────────────────┐
${d}    │  ${w}A Bulletin Board System for the Vibe Coding Era   ${d}  │
${d}    │  ${dm}Where retro meets the future of AI-assisted code ${d}  │
${d}    └──────────────────────────────────────────────────────┘
${r}
${y}    ═══════════════════════════════════════════════════════${r}

`;
};

ansi.art.loginPrompt = () => {
  const c = ansi.brightCyan;
  const w = ansi.brightWhite;
  const g = ansi.green;
  const r = ansi.reset;

  return `${c}    ┌─────────────────────────────────┐
${c}    │  ${w}Enter your credentials below   ${c}  │
${c}    │  ${g}or type ${w}NEW${g} to register        ${c}  │
${c}    └─────────────────────────────────┘${r}

`;
};

ansi.art.mainMenu = (username, nodeName, callCount) => {
  const r = ansi.reset;
  const c = ansi.brightCyan;
  const m = ansi.brightMagenta;
  const y = ansi.brightYellow;
  const w = ansi.brightWhite;
  const g = ansi.brightGreen;
  const d = ansi.cyan;

  return ansi.clear +
`${d}    ┌──────────────────────────────────────────────────────┐
${d}    │${c}  ▄   ▄ ${m}▄▄▄ ${y}█▀▀▄ ${g}█▀▀  ${w}█▀▀▄ ${c}█▀▀▄ ${m}▄▀▀▀  ${d}                │
${d}    │${c}  █   █ ${m} █  ${y}█▀▀▄ ${g}█▀▀  ${w}█▀▀▄ ${c}█▀▀▄ ${m}▀▀▀█  ${d}  ${w}Main Menu   ${d}  │
${d}    │${c}   ▀▄▀  ${m}▄█▄ ${y}▀▀▀  ${g}▀▀▀▀ ${w}▀▀▀  ${c}▀▀▀  ${m}▀▀▀   ${d}                │
${d}    ├──────────────────────────────────────────────────────┤
${d}    │  ${g}User: ${w}${(username || '').padEnd(18)}${d}  ${g}Node: ${w}${(nodeName || '').padEnd(5)}${d}  ${g}Calls: ${w}${String(callCount || 0).padEnd(5)}${d} │
${d}    ├──────────────────────────────────────────────────────┤
${d}    │                                                      │
${d}    │  ${y}[${w}M${y}]${c} Message Bases        ${y}[${w}W${y}]${c} Who's Online          ${d}│
${d}    │  ${y}[${w}F${y}]${c} File Areas           ${y}[${w}U${y}]${c} User Settings         ${d}│
${d}    │  ${y}[${w}D${y}]${c} Door Games           ${y}[${w}P${y}]${c} Page SysOp            ${d}│
${d}    │  ${y}[${w}B${y}]${c} Bulletins            ${y}[${w}S${y}]${c} System Stats          ${d}│
${d}    │  ${y}[${w}C${y}]${c} Chat Rooms           ${y}[${w}G${y}]${c} Goodbye / Logoff      ${d}│
${d}    │                                                      │
${d}    └──────────────────────────────────────────────────────┘
${r}
`;
};

ansi.art.messageBases = (bases) => {
  const r = ansi.reset;
  const c = ansi.brightCyan;
  const y = ansi.brightYellow;
  const w = ansi.brightWhite;
  const g = ansi.brightGreen;
  const d = ansi.cyan;

  let screen = ansi.clear +
`${d}    ┌──────────────────────────────────────────────────────┐
${d}    │${m}             ░█▄█░█▀▀░█▀▀░█▀▀░█▀█░█▀▀░█▀▀░█▀▀       ${d}│
${d}    │${m}             ░█░█░██▀░▀▀█░▀▀█░█▀█░█░█░██▀░▀▀█       ${d}│
${d}    │${m}             ░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀       ${d}│
${d}    ├──────────────────────────────────────────────────────┤
${d}    │  ${y}#   ${w}Conference Name              ${g}Messages   New    ${d}│
${d}    ├──────────────────────────────────────────────────────┤\r\n`;

  const m = ansi.brightMagenta;

  if (bases && bases.length > 0) {
    for (const base of bases) {
      const num = String(base.id).padEnd(4);
      const name = (base.name || '').padEnd(28);
      const total = String(base.totalMessages || 0).padStart(6);
      const unread = String(base.newMessages || 0).padStart(6);
      screen += `${d}    │  ${y}${num}${w}${name}  ${c}${total}  ${g}${unread}    ${d}│\r\n`;
    }
  }

  screen += `${d}    ├──────────────────────────────────────────────────────┤
${d}    │  ${y}[${w}#${y}]${c} Select conference   ${y}[${w}Q${y}]${c} Return to Main Menu   ${d}  │
${d}    └──────────────────────────────────────────────────────┘
${r}
`;
  return screen;
};

ansi.art.messageRead = (msg) => {
  const r = ansi.reset;
  const c = ansi.brightCyan;
  const y = ansi.brightYellow;
  const w = ansi.brightWhite;
  const g = ansi.brightGreen;
  const d = ansi.cyan;

  return `${d}    ┌──────────────────────────────────────────────────────┐
${d}    │ ${y}Msg#: ${w}${String(msg.id).padEnd(8)} ${y}Date: ${w}${(msg.date || '').padEnd(20)} ${d}      │
${d}    │ ${y}From: ${w}${(msg.fromUser || '').padEnd(20)} ${y}To: ${w}${(msg.toUser || 'All').padEnd(17)} ${d}│
${d}    │ ${y}Subj: ${w}${(msg.subject || '').padEnd(44)} ${d}│
${d}    ├──────────────────────────────────────────────────────┤
${d}    │${r}  ${msg.body || ''}
${d}    ├──────────────────────────────────────────────────────┤
${d}    │  ${y}[${w}R${y}]${c}eply  ${y}[${w}N${y}]${c}ext  ${y}[${w}P${y}]${c}rev  ${y}[${w}Q${y}]${c}uit              ${d}    │
${d}    └──────────────────────────────────────────────────────┘${r}
`;
};

ansi.art.goodbye = () => {
  const r = ansi.reset;
  const c = ansi.brightCyan;
  const m = ansi.brightMagenta;
  const y = ansi.brightYellow;
  const w = ansi.brightWhite;

  return ansi.clear +
`
${c}    ╔══════════════════════════════════════════════════════╗
${c}    ║                                                      ║
${c}    ║  ${y}  ████  █████  █████     █   █ ████  ██████ █████  ${c}║
${c}    ║  ${y}  █     █   █  █   █     █   █  ██   █    █ █      ${c}║
${c}    ║  ${y}  █  ██ █   █  █   █     █   █  ██   █████  ████   ${c}║
${c}    ║  ${y}  █   █ █   █  █   █      █ █   ██   █    █ █      ${c}║
${c}    ║  ${y}  ████  █████  █████       █   ████  ██████ █████  ${c}║
${c}    ║                                                      ║
${c}    ║  ${m}Thanks for visiting VibeBBS! Keep vibing! ${w}✦        ${c}║
${c}    ║  ${w}Your session has been logged. Call again soon!     ${c}║
${c}    ║                                                      ║
${c}    ╚══════════════════════════════════════════════════════╝${r}

`;
};

ansi.art.whosOnline = (nodes) => {
  const r = ansi.reset;
  const c = ansi.brightCyan;
  const y = ansi.brightYellow;
  const w = ansi.brightWhite;
  const g = ansi.brightGreen;
  const d = ansi.cyan;

  let screen = ansi.clear +
`${d}    ┌──────────────────────────────────────────────────────┐
${d}    │${w}                  Who's Online                        ${d}│
${d}    ├──────────────────────────────────────────────────────┤
${d}    │  ${y}Node  ${w}Username             ${g}Activity               ${d}│
${d}    ├──────────────────────────────────────────────────────┤\r\n`;

  if (nodes && nodes.length > 0) {
    for (const node of nodes) {
      const nodeNum = String(node.nodeNum).padEnd(6);
      const user = (node.username || 'Logging in...').padEnd(20);
      const activity = (node.activity || 'Idle').padEnd(22);
      screen += `${d}    │  ${y}${nodeNum}${w}${user} ${g}${activity} ${d}│\r\n`;
    }
  } else {
    screen += `${d}    │  ${w}No other users online                               ${d}│\r\n`;
  }

  screen += `${d}    └──────────────────────────────────────────────────────┘${r}
${ansi.pausePrompt}`;
  return screen;
};

ansi.art.systemStats = (stats) => {
  const r = ansi.reset;
  const c = ansi.brightCyan;
  const y = ansi.brightYellow;
  const w = ansi.brightWhite;
  const g = ansi.brightGreen;
  const d = ansi.cyan;

  return ansi.clear +
`${d}    ┌──────────────────────────────────────────────────────┐
${d}    │${w}                  System Statistics                   ${d}│
${d}    ├──────────────────────────────────────────────────────┤
${d}    │  ${y}Total Users:     ${w}${String(stats.totalUsers || 0).padStart(8)}                         ${d}│
${d}    │  ${y}Total Messages:  ${w}${String(stats.totalMessages || 0).padStart(8)}                         ${d}│
${d}    │  ${y}Total Calls:     ${w}${String(stats.totalCalls || 0).padStart(8)}                         ${d}│
${d}    │  ${y}Nodes Online:    ${w}${String(stats.nodesOnline || 0).padStart(8)}                         ${d}│
${d}    │  ${y}Max Nodes:       ${w}${String(stats.maxNodes || 0).padStart(8)}                         ${d}│
${d}    │  ${y}BBS Version:     ${w}${'   1.0.0'}                         ${d}│
${d}    │  ${y}Uptime:          ${w}${(stats.uptime || 'N/A').padStart(8)}                         ${d}│
${d}    └──────────────────────────────────────────────────────┘${r}
${ansi.pausePrompt}`;
};

module.exports = ansi;

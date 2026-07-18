# Backlog

## Portfolio audit backlog — 2026-07-17
_Findings from a 2026-07-17 code audit, preserved for later._

### Later / deferred
- **[low/M]** '[N]ew messages' reader has a stubbed unread filter that returns everything (bbs.js:566-568)
  - Fix: src/core/bbs.js:566 filter always returns true. Proper fix needs a message_read tracking table (user_id, message_id or last-read high-water mark per base) plus a query; then filter msgs by unread. Cosmetic today — [N] just shows all msgs. Hobby BBS.
- **[low/L]** File areas are list-only — handleFileList just calls showFileAreas, no upload/download transfer (bbs.js:805)
  - Fix: src/core/bbs.js:805 handleFileList is a stub. Real file transfer over telnet/websocket (list contents, download/upload, protocol) is a substantial feature; config.json already defines fileAreas dirs. Incomplete feature, not a defect.
- **[low/L]** No automated tests exist (no *.test.js, package.json has only start/dev scripts)
  - Fix: Add a test runner + suite. Highest-value targets: db.users.authenticate / access levels, admin requireAuth, message base access gating. Real setup effort for a codebase with none.

### Known limitations (deliberate — not planned)
- /admin static HTML served without requireAuth; only /admin/api/* routes gated

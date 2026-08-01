# PacketBBS Operations Runbook

This runbook is the release, Docker, Railway, backup, recovery, and public-smoke contract for PacketBBS 1.2.1.

## Docker service contract

The committed `compose.yaml` builds the production image, publishes the web listener on host port `8088`, publishes raw Telnet on standard host port `23`, and persists `/app/data` and `/app/files` in directories beside the Compose file. Caddy or another reverse proxy should send the web hostname to port `8088` with WebSocket upgrades intact. Telnet is a separate TCP service and never passes through the HTTP reverse proxy.

Create `.env` from `.env.example`, set `NODE_ENV=production`, and supply a unique `PACKETBBS_SYSOP_PASSWORD` of at least 12 characters. Then run:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 packetbbs
```

Before an upgrade, use SQLite's online backup API or stop the container before copying the database. Preserve both `data/` and `files/`. After an upgrade, require a healthy container and run the public HTTP/Telnet smoke test. At the network edge, forward TCP/80 and TCP/443 to the reverse proxy and TCP/23 directly to the Docker host.

## Railway service contract

The committed `railway.json` requires one replica, a `/healthz` deployment health check, and a persistent volume mounted at `/app/data`. PacketBBS reads Railway's `PORT` for HTTP and keeps raw Telnet on a separate `TELNET_PORT` (or Railway's injected `RAILWAY_TCP_APPLICATION_PORT`).

Configure these service variables before deploying a fresh board:

```text
NODE_ENV=production
PACKETBBS_DB_PATH=/app/data/packetbbs.db
PACKETBBS_SYSOP_PASSWORD=<long random password, at least 12 characters>
TELNET_PORT=2323
```

Optional variables:

```text
ANTHROPIC_API_KEY=<Door 5 only>
PACKETBBS_ALLOWED_ORIGINS=https://bbs.example.com
PACKETBBS_PUBLIC_WEB_URL=https://bbs.example.com
PACKETBBS_PUBLIC_TELNET_HOST=bbs.example.com
PACKETBBS_PUBLIC_TELNET_PORT=<Railway TCP proxy port>
```

Do not set `PORT` on Railway unless deliberately overriding its provided HTTP port.

In Railway networking:

1. Attach a volume to the PacketBBS service at `/app/data`.
2. Enable HTTP public networking for the web terminal and `/admin`.
3. Add a TCP Proxy whose application port is `2323`.
4. Record the generated TCP proxy domain and external port. The external port is normally not `2323`.
5. Keep the service at one replica; one SQLite database and one BBS node manager are process-local authorities.

Railway configuration references:

- [Public networking and `PORT`](https://docs.railway.com/public-networking)
- [HTTP and TCP Proxy on one service](https://docs.railway.com/networking/tcp-proxy)
- [Persistent volumes](https://docs.railway.com/volumes)
- [Volume backups](https://docs.railway.com/volumes/backups)
- [Deployment health checks](https://docs.railway.com/deployments/healthchecks)

## Release gate

Run from a clean checkout:

```bash
npm ci
npm run verify
npm run smoke
npm audit --omit=dev --audit-level=high
```

`npm run smoke` starts PacketBBS against an isolated temporary SQLite database, checks `/healthz`, loads the web terminal, opens the Telnet listener, and shuts the process down.

For a deployed board, provide the public endpoints instead of starting a local process:

```powershell
$env:PACKETBBS_SMOKE_WEB_URL = 'https://bbs.example.com'
$env:PACKETBBS_SMOKE_TELNET_HOST = 'bbs.example.com'
$env:PACKETBBS_SMOKE_TELNET_PORT = '15140'
npm run smoke
```

The public smoke uses no caller credentials and only reads the health response, web-terminal shell, and Telnet welcome banner.

## Health and monitoring

`GET /healthz` returns `200` only when the process can query SQLite. The response includes the PacketBBS version, process uptime, database status, and online-node count. It contains no credentials or filesystem paths.

Railway uses this endpoint while activating a deployment. It is not continuous monitoring; use a separate uptime monitor if ongoing alerting is required.

## Backups and recovery

Enable daily and weekly backups for the `/app/data` Railway volume. Take a manual backup before schema changes or a release rollback.

For a local stopped service, preserve the entire `data/` directory so the SQLite database and any WAL sidecars remain together. Do not copy only the main `.db` file while PacketBBS is running.

Recovery procedure:

1. Stop or isolate the current service.
2. Restore the selected Railway volume backup to `/app/data`.
3. Confirm `PACKETBBS_DB_PATH=/app/data/packetbbs.db`.
4. Deploy the known-good PacketBBS tag or commit.
5. Check `/healthz`, then run the public HTTP/Telnet smoke command.
6. Sign in as SysOp and verify callers, messages, mail, and the recent call log.

## Credential and exposure checklist

- A fresh production database will not start without `PACKETBBS_SYSOP_PASSWORD` of at least 12 characters.
- The `SysOp / sysop` seed exists only in explicit development/test mode.
- Existing databases are not silently re-keyed. Reset any historical default SysOp password before public exposure.
- New caller and admin-reset passwords require at least eight characters.
- Telnet is plaintext by design. Do not reuse a PacketBBS password on any other service.
- Browser WebSockets accept same-origin requests plus explicit `PACKETBBS_ALLOWED_ORIGINS` entries.
- Login, registration, connection, request-size, and terminal-input limits are process-local safeguards. Put an internet-facing reverse proxy or platform protection in front of HTTP for broader abuse control.

## Rollback

Code rollback and data rollback are separate decisions:

- Re-deploy a prior Git tag when code is bad but the database is healthy and schema-compatible.
- Restore a volume backup only when data is damaged or a migration cannot be reversed.
- After either path, run the public smoke and inspect the SysOp dashboard before reopening normal access.

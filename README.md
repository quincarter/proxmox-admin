# proxmox-admin

An operator-focused administration console for Proxmox VE. Built with Lit + TypeScript on the frontend and NestJS as a backend-for-frontend (BFF), deployed via Docker Compose.

---

## Stack

| Layer                 | Technology                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Frontend              | Lit 3, TypeScript, Vite, `@lit-labs/router`, `@lit-labs/preact-signals`, `@lit/task`, Chart.js |
| BFF                   | NestJS 11, Express, `@nestjs/platform-ws`                                                      |
| Polling worker        | Node.js TypeScript (standalone Docker service)                                                 |
| Realtime transport    | Server-Sent Events over HTTP/2 via Redis pub/sub                                               |
| SSH terminal          | xterm.js v6, `ssh2`, WebSocket gateway, SharedWorker                                           |
| Persistence (server)  | Prisma ORM + PostgreSQL                                                                        |
| Persistence (browser) | IndexedDB (planned)                                                                            |
| Reverse proxy         | Caddy 2 (HTTP/2 + HTTP/3 QUIC, optional)                                                       |
| Monorepo              | Nx                                                                                             |

---

## Project structure

```
proxmox-admin/
├── apps/
│   ├── api/          # NestJS BFF
│   ├── web/          # Lit SPA
│   └── worker/       # Proxmox polling worker
├── packages/
│   └── types/        # Shared TypeScript types (Proxmox domain + BFF contract)
├── docker-compose.yml
├── Caddyfile
└── nx.json
```

---

## Getting started

### Prerequisites

- Node.js ≥ 22
- Yarn 4 (`corepack enable`)
- Docker + Docker Compose (for the full stack)

### Install dependencies

```sh
yarn install
```

### Run in development mode

```sh
# Start both BFF (port 3000) and web dev server (port 5173) with hot reload
yarn dev

# Or individually
yarn dev:api
yarn dev:web
```

The web dev server proxies `/api` and `/ws` requests to the BFF automatically.

> **Note:** In dev mode the SSE stream sends heartbeats only unless Redis is running. See [Realtime stream](#realtime-stream) below.

### Run all tests

```sh
yarn test
```

### Full verify (lint + build + test)

```sh
yarn verify
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values for your environment:

```sh
cp .env.example .env
```

`.env` is gitignored — never commit real credentials. The convenience scripts and `docker compose` both load it automatically.

### Full variable reference

| Variable                          | Required      | Default                  | Used by     | Description                                                  |
| --------------------------------- | ------------- | ------------------------ | ----------- | ------------------------------------------------------------ |
| `PROXMOX_HOST`                    | **yes**       | —                        | worker      | IP address or hostname of your Proxmox VE node               |
| `PROXMOX_PORT`                    | no            | `8006`                   | worker      | Proxmox API port                                             |
| `PROXMOX_USER`                    | **yes**       | —                        | worker      | Login username without realm (e.g. `root`)                   |
| `PROXMOX_PASS`                    | **yes**       | —                        | worker      | Login password                                               |
| `PROXMOX_REALM`                   | no            | `pam`                    | worker      | Auth realm: `pam`, `pve`, or an LDAP realm name              |
| `PROXMOX_TLS_REJECT_UNAUTHORIZED` | no            | `false`                  | worker      | Set `true` only when the Proxmox cert is CA-signed           |
| `POLL_INTERVAL_MS`                | no            | `15000`                  | worker      | How often (ms) the worker polls Proxmox                      |
| `LOG_LEVEL`                       | no            | `info`                   | worker      | Worker log verbosity: `debug` \| `info` \| `warn` \| `error` |
| `REDIS_URL`                       | no            | `redis://localhost:6379` | worker, api | Redis connection URL; use `redis://redis:6379` inside Docker |
| `DATABASE_URL`                    | **yes** (api) | —                        | api         | PostgreSQL connection string                                 |
| `PORT`                            | no            | `3000`                   | api         | Port the BFF listens on                                      |
| `CORS_ORIGIN`                     | no            | `http://localhost:5173`  | api         | Allowed CORS origin for the web frontend                     |
| `NODE_ENV`                        | no            | `development`            | api         | App environment (`development` \| `production`)              |

> **Homelab tip:** `PROXMOX_TLS_REJECT_UNAUTHORIZED=false` is the right setting for the default Proxmox self-signed certificate. Only change it to `true` if you have replaced the cert with one signed by a trusted CA.

---

## Local dev with Docker

A convenience script at `scripts/dev-up.sh` manages the Docker stack. It loads `.env` automatically and waits for services to pass their healthchecks before printing a summary.

### Quick-start modes

```sh
# Infra only (Postgres + Redis) — then run the app locally with yarn dev
./scripts/dev-up.sh

# Infra + pre-built API + web containers
./scripts/dev-up.sh --full

# Infra + polling worker (requires PROXMOX_* vars in .env)
./scripts/dev-up.sh --worker

# Everything: infra + api + web + worker + Caddy reverse proxy
./scripts/dev-up.sh --all

# Tear down all containers
./scripts/dev-up.sh --down

# Follow logs
./scripts/dev-up.sh --logs
```

These are also available as Yarn scripts:

```sh
yarn infra:up       # same as ./scripts/dev-up.sh
yarn infra:down     # tear down
yarn infra:logs     # follow logs
yarn docker:full    # --full
yarn docker:all     # --all
```

---

## Docker Compose (manual)

### Base stack (API + web + Postgres + Redis)

```sh
docker compose up
```

### With the Proxmox polling worker

```sh
# Using .env
docker compose --profile worker up

# Or inline
PROXMOX_HOST=192.168.1.10 PROXMOX_USER=root PROXMOX_PASS=secret \
  docker compose --profile worker up
```

### With Caddy (HTTP/2 + HTTP/3)

```sh
docker compose --profile worker --profile caddy up
```

Access the app at **https://localhost**. Caddy auto-provisions a locally-trusted TLS certificate. Trust it once with:

```sh
docker exec caddy caddy trust
```

---

## Realtime stream

The app uses **Server-Sent Events (SSE)** over HTTP/2 to push live Proxmox data to the browser without polling from the frontend.

### Architecture

```
Proxmox VE
    │
    │ HTTPS (ssh2 / axios)
    ▼
apps/worker  ─── Redis pub/sub ───▶  apps/api EventsModule
                (ioredis)                   │
                                            │ SSE  GET /api/events/stream
                                            ▼
                                   Browser SharedWorker
                                   (events-sse.worker.ts)
                                            │
                                   MessagePort broadcast
                                            │
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
                      Tab 1              Tab 2              Tab 3
                  (preact-signals)   (preact-signals)   (preact-signals)
```

### How it works

1. **Worker** (`apps/worker`) authenticates directly with Proxmox and polls on a configurable interval. It publishes typed event payloads to four Redis channels: `pxa:nodes`, `pxa:guests`, `pxa:storage`, `pxa:tasks`.

2. **BFF EventsModule** (`apps/api/src/modules/events`) subscribes to those Redis channels via `ioredis`. The `EventsController` exposes `GET /api/events/stream` as a named-event SSE endpoint protected by `SessionGuard`. A 30 s heartbeat keeps connections alive through proxies.

3. **Browser SharedWorker** (`apps/web/src/workers/events-sse.worker.ts`) opens exactly **one** `EventSource` connection regardless of how many tabs are open and fans events to all of them via `MessagePort`. Automatically reconnects on error.

4. **Reactive signals** (`apps/web/src/app/event-stream.ts`) — the SharedWorker updates `@lit-labs/preact-signals` that any `SignalWatcher` component can consume directly:

   ```ts
   import { liveNodes, liveGuests, sseStatus } from "../../app/event-stream";
   ```

   | Signal        | Type                                                       | Description                      |
   | ------------- | ---------------------------------------------------------- | -------------------------------- |
   | `sseStatus`   | `"connecting" \| "connected" \| "reconnecting" \| "error"` | Connection health                |
   | `sseClientId` | `string`                                                   | Server-assigned connection ID    |
   | `liveNodes`   | `NodeSummary[] \| null`                                    | Latest node list                 |
   | `liveGuests`  | `Map<string, AnyGuest[]>`                                  | Guests per node                  |
   | `liveStorage` | `Map<string, StorageSummary[]>`                            | Storage per node                 |
   | `liveTasks`   | `Map<string, TaskSummary[]>`                               | Recent tasks per node            |
   | `lastEventAt` | `number \| null`                                           | Timestamp of last received event |

5. **SSE status indicator** — a pulsing dot in the app header indicates stream health (green/amber/gray).

### Graceful degradation

- If `REDIS_URL` is not set in the BFF, the SSE stream sends heartbeats only — the UI connects and stays live but does not receive data events.
- The SharedWorker is feature-detected at runtime; if `SharedWorker` is unsupported, the stream simply does not connect and components fall back to their initial state.

---

## SSH terminal

An interactive in-browser terminal for VMs and LXC containers, accessible from the VM/LXC detail view.

- **Backend** — NestJS `SshGateway` at `ws://host/ws/ssh` relays PTY sessions over `ssh2`. LXC containers use `pct enter {vmid}`, QEMU VMs use `qm terminal {vmid}`.
- **Frontend** — `<pxa-ssh-terminal>` Lit component backed by xterm.js v6 with `FitAddon` for responsive resize.
- **Cross-tab sessions** — a `SharedWorker` (`ssh-shared.worker.ts`) holds the WebSocket connection; popping out the terminal into a new tab attaches to the same session with a 50 KB replay buffer.
- **Pop-out** — the ⤢ toolbar button opens the terminal in a standalone popup window at `/ssh-terminal/:sessionId`.

---

## Development workflow

1. **Define types first** — add or update domain types in `packages/types/src/`.
2. **Write tests before implementation** where practical.
3. **Implement** — backend module, then frontend component.
4. **Verify before committing:**
   ```sh
   yarn verify
   ```

See [docs/implementation-plan.md](docs/implementation-plan.md) for the feature roadmap.

# Proxmox Admin Implementation Plan

## Objectives

Build a locally hosted Proxmox administration app for use on a trusted local network, with a UI focused on operational visibility and common management actions.

Initial scope:

- Connect to one or more Proxmox VE servers
- Support secure login/session handling
- Support optional automatic server discovery on the local network
- Provide a dashboard overview
- Provide LXC and LVM storage dashboards and detail pages
- Support operational actions such as update checks, SSH access handoff, shutdown, reboot, and power on

## Recommended Architecture

### Frontend

- Lit + TypeScript SPA
- `@lit-labs/router` for navigation
- `@lit-labs/preact-signals` for top-level shared state
- `@lit/task` for async request state in components
- Effect for typed services, schemas, and error handling where it materially improves reliability
- Chart.js for health, utilization, and stability visualizations

### Backend for Frontend

Recommended: add a small NestJS BFF service between the browser and Proxmox.

Recommended persistence for the BFF:

- Prisma ORM
- a local database, preferably SQLite for the initial implementation unless multi-user or concurrent write requirements push the project toward PostgreSQL later

Why:

- Keeps Proxmox credentials, tickets, API tokens, and CSRF-sensitive flows off the browser
- Centralizes server discovery, session handling, proxying, normalization, and audit logging
- Allows LAN-aware discovery and environment-based configuration without exposing the Proxmox API directly to the client
- Creates a clean seam for SSH-related actions and future multi-server support
- Provides a typed local schema for durable server-side records such as known servers, discovery results, preferences, connection metadata, and task history snapshots when those need to live outside the browser
- Encourages a stricter backend structure through NestJS modules, controllers, providers, guards, DTOs, and interceptors

### Deployment Model

Preferred initial deployment:

- Run the BFF in Docker for local hosting, proxying, and environment configuration
- Serve the frontend either:
  - from the BFF directly as static assets, or
  - as a separate static site behind the same reverse proxy

Recommendation:

- Containerize the BFF first
- Keep the frontend deployable as static assets
- Only containerize the frontend separately if deployment simplicity or reverse proxy topology requires it

This gives a practical path where Docker is used for local deployment and configuration while avoiding unnecessary complexity in the frontend runtime.

## Core Assumptions

- The app is accessed remotely over a trusted local network, not exposed directly to the public internet.
- Proxmox remains the system of record.
- The BFF stores minimal durable state locally, mainly server metadata, preferences, recent connections, discovery metadata, and selected task history snapshots.
- Prisma is used for structured server-side persistence in the BFF.
- Browser persistence uses IndexedDB.
- Server-side secrets and connection configuration live in environment variables or secure local configuration, not in browser storage.
- Server discovery is a convenience feature, not the only connection path.

## Persistence Model

### Browser-side persistence

- IndexedDB for recent servers, client cache, offline-tolerant summaries, and UI preferences

### Server-side persistence

- Prisma-managed local database for structured BFF data
- Keep secrets out of the browser and, where possible, out of durable storage unless explicitly required by the product design

Initial Prisma candidates:

- known server records
- discovery scan results and trust state
- local user preferences relevant to the hosted app
- connection audit metadata
- cached task history snapshots or normalized summaries when useful for the BFF

## Implementation Phases

## Phase 0: Discovery and Architecture Spike

Goals:

- Validate the Proxmox authentication flow to be used
- Confirm the BFF contract shape
- Decide how discovery will work on the local network
- Define the first domain types and service boundaries
- Reference `./.github/llmstxt/proxmox-llms-full.txt` where needed for Proxmox schemas, terminology, workflows, and API documentation details
- Reference `./.github/llmstxt/nestjs_full.txt` where needed for BFF architecture, module boundaries, controllers, providers, guards, and request-validation patterns

Deliverables:

- Typed domain models for server connection, auth session, node summary, LXC summary, and LVM storage summary
- BFF API contract draft
- Initial Prisma schema draft for BFF-local persistence
- Initial NestJS application shape covering modules, controllers, providers, and persistence boundaries
- Decision record for auth strategy and discovery strategy
- Test plan for auth, discovery, and dashboard data normalization
- A mapping note that ties initial domain models and endpoint contracts back to the relevant Proxmox reference sections where practical

Key decisions to make:

- Ticket-based login versus API token support versus both
- Single-server first versus multi-server first
- SQLite first versus another local database for Prisma-backed persistence
- NestJS module boundaries for auth, proxmox access, discovery, persistence, and actions
- Discovery mechanism:
  - manual entry only for MVP
  - environment-provided known server list
  - LAN scan or mDNS-assisted discovery as an opt-in enhancement

Recommendation:

- Start with manual server entry plus optional environment-provided defaults
- Start with Prisma + SQLite for the BFF unless clear multi-user requirements emerge early
- Treat automatic discovery as phase 1.5, not a blocker for the first usable build

## Phase 1: Login, Session Management, and Server Selection

Goals:

- Let a user connect to a Proxmox server from the local network
- Persist non-secret connection metadata for convenience
- Support reconnect and recent server selection

Frontend scope:

- Login screen
- Server selector with recent connections
- Connection status and validation states
- Error states for TLS, auth failure, unreachable host, and permission issues

BFF scope:

- Proxmox session creation endpoint
- Session refresh and logout
- Server connection validation
- Per-server capability handshake endpoint
- NestJS auth and proxmox modules with clear controller and provider boundaries
- Prisma-backed persistence for known server records and non-secret connection metadata where needed by the hosted app

Persistence:

- IndexedDB for recent servers, non-secret preferences, and cached summaries
- Prisma for BFF-side known server records, local preferences that belong to the hosted deployment, and optional connection audit metadata
- No raw passwords stored in browser persistence

Testing:

- Types first for auth models and connection models
- Contract tests for BFF auth endpoints
- Component tests for login flow states
- Integration tests for successful login, failed login, and reconnect

## Phase 1.5: Local Network Server Discovery

Goals:

- Help users find likely Proxmox endpoints on the LAN

Scope:

- BFF discovery service
- Manual confirmation before saving or connecting
- Discovery results surfaced as suggestions, not automatic trust
- NestJS discovery module and provider boundary
- Prisma-backed storage for discovered hosts, trust decisions, and last-seen metadata where persistence adds operational value

Possible approaches:

- configured host list from environment
- subnet scan for likely Proxmox hosts and management ports
- reverse proxy or service registry integration if available

Recommendation:

- Start with configured host hints and optional scan
- Avoid making discovery mandatory for normal app use

Risks:

- false positives on the local network
- TLS certificate mismatches
- network scan behavior varying across environments

## Phase 2: Dashboard Foundation

Goals:

- Present a stable operational overview immediately after login
- Make the first screen useful for day-to-day health checks

Dashboard sections:

- Server and cluster summary
- Node health summary
- Guest counts by type and status
- Storage capacity and warning states
- Task activity summary
- Repository or update status summary where available
- Stability and utilization charts using Chart.js

UI outcomes:

- Dense, dark-mode-first overview optimized for local admin usage
- Strong status hierarchy: healthy, warning, critical, unknown
- Fast navigation to LXC, LVM, nodes, and actions

Data considerations:

- Normalize Proxmox API responses in the BFF or workerized client adapters
- Cache dashboard summaries in IndexedDB for fast reload and offline-tolerant UI states
- Persist selected normalized summaries or task metadata in Prisma only if the BFF benefits from local history or cross-session continuity

## Phase 3: LXC Dashboard and Detail Pages

Goals:

- Make container inventory and operational access first-class

Dashboard scope:

- LXC list view
- filters by node, state, tags, health, and resource usage
- quick action affordances

Detail page scope:

- identity and placement
- current status and resource usage
- network summary
- storage summary
- recent task history
- action panel

Actions in scope:

- start
- shutdown
- reboot
- console or SSH handoff entry point where supported by the chosen architecture

Testing:

- Type definitions for LXC summaries, detail models, and action requests
- Adapter tests for transforming Proxmox responses
- UI tests for filtering, details, and action-state rendering

## Phase 4: LVM Storage Dashboard and Detail Pages

Assumption:

- "LVM dashboard" refers to storage views around Proxmox local LVM and related storage capacity/health details.

Goals:

- Make storage status visible and actionable without dropping into shell tools for common checks

Dashboard scope:

- storage inventory
- capacity and usage visualization
- node association
- warning states and degraded states

Detail page scope:

- storage type and mount or backing context
- usage trend chart where available
- volume or content summary where relevant
- relation to nodes and guests
- operational notes and constraints

Future extension:

- expand from LVM-specific views into broader storage views for ZFS, directory storage, NFS, Ceph RBD, and CephFS

## Phase 5: Operational Actions

Goals:

- Support high-value actions with clear confirmation and task feedback

Initial action set:

- refresh summaries
- trigger update status refresh
- shutdown node or guest
- reboot node or guest
- power on guest
- SSH handoff or launch helper

Action design rules:

- destructive or disruptive actions require explicit confirmation
- every action returns task progress and terminal outcome
- action permissions are surfaced clearly in the UI
- task history is linked from action results

Implementation notes:

- Prefer proxied API actions through the BFF
- For SSH, prefer handoff patterns such as copying a command, opening a configured local handler, or generating a secure launch target rather than embedding shell logic in the frontend
- Persist action audit metadata and task references in Prisma if local hosted auditability is useful

## Feature Order Recommendation

Build in this order:

1. Types and service contracts
2. NestJS BFF skeleton and module boundaries
3. Prisma schema and BFF persistence layer
4. BFF auth and connection validation
5. Login UI and recent-server persistence
6. Manual server selection
7. Dashboard summary endpoints and overview page
8. LXC inventory and detail page
9. LVM storage inventory and detail page
10. Operational actions and task feedback
11. Optional automatic discovery

This order gets the first usable admin flow online quickly while leaving discovery as an enhancement instead of a dependency.

## Suggested Repository Expansion

As implementation starts, grow the project roughly in this shape:

```text
src/
  app/
  components/
  features/
    auth/
    dashboard/
    lxc/
    storage/
    actions/
  state/
  data/
  persistence/
  workers/
  types/
server/
  prisma/
  src/
    modules/
    controllers/
    providers/
    proxmox/
    discovery/
    ssh/
    persistence/
    types/
docs/
```

## Testing Strategy

For each feature area:

1. Define the domain types and request or response contracts.
2. Add tests for adapters, service boundaries, and permission logic.
3. Add component tests for loading, empty, success, and error states.
4. Implement the feature after types and tests are in place.

Priority test areas:

- auth/session lifecycle
- NestJS module and controller boundary behavior
- Prisma schema and persistence behavior
- discovery normalization and trust prompts
- dashboard aggregation
- action confirmation and task-state handling
- permission-sensitive UI behavior

## Risks and Constraints

- Proxmox authentication and TLS behavior may vary by environment.
- Prisma should remain a BFF concern and not leak into browser-side architecture.
- Discovery can create UX and trust issues if it is too aggressive.
- SSH integration can become platform-specific if it goes beyond handoff patterns.
- Node actions and guest actions need careful permission modeling.
- Storage semantics differ by backend, so LVM should be modeled as one storage feature slice, not the final storage abstraction.

## MVP Definition

The first meaningful release should include:

- NestJS BFF-backed login to a manually entered Proxmox server
- Prisma-backed local BFF persistence using an initial schema suited to known servers and hosted-app metadata
- recent server recall using IndexedDB
- one dashboard overview page
- LXC inventory and detail pages
- LVM storage inventory and detail pages
- shutdown, reboot, and power-on flows with confirmation and task feedback

Everything beyond that, including automatic discovery and richer SSH workflows, can ship incrementally.

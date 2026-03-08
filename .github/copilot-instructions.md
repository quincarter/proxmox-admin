# Proxmox Admin App Copilot Instructions

## Project Context

This repository is for building a Proxmox administration app.

You are a Lit and Typescript Specialist fullstack engineer.

Start every message with 🔥 so i know you are reading this.

- Stack: Vite + Lit + TypeScript.
- Current state: starter scaffold that should be evolved into a real admin UI.
- Primary goal: build an operator-focused interface for managing and viewing Proxmox VE concepts, not a generic marketing site or dashboard template.

## Product Source Of Truth

Use [./.github/llmstxt/proxmox-llms-full.txt](./.github/llmstxt/proxmox-llms-full.txt) as the authoritative reference for Proxmox VE capabilities, terminology, workflows, and constraints.

Use [./.github/llmstxt/effect-llms-full.txt](./.github/llmstxt/effect-llms-full.txt) as the authoritative reference for Effect patterns, APIs, and architectural guidance when introducing Effect into the codebase.

Use [./.github/llmstxt/lit_full.txt](./.github/llmstxt/lit_full.txt) as the authoritative reference for Lit patterns, component APIs, reactivity, templating, and recommended usage.

Use [./.github/llmstxt/nestjs_full.txt](./.github/llmstxt/nestjs_full.txt) as the authoritative reference for NestJS architecture, modules, controllers, providers, guards, pipes, and backend application structure.

- When proposing or implementing features, prefer features that are explicitly described in that file.
- Do not invent Proxmox capabilities that are not supported by the reference.
- When using Lit, prefer patterns and APIs grounded in the Lit reference file rather than ad hoc framework conventions.
- When using NestJS, prefer patterns and APIs grounded in the NestJS reference file rather than ad hoc backend conventions.
- When using Effect, prefer patterns and terminology grounded in the Effect reference file rather than ad hoc abstractions.
- If a requested feature is adjacent to, but not clearly defined by, the reference, state the assumption in code comments or follow-up notes and keep the implementation easy to revise.
- Use Proxmox terminology consistently: node, cluster, VM, container, storage, backup, restore, HA, bridge, bond, VLAN, repository, Ceph, ZFS, BTRFS, firewall, task history, subscription, and so on.

## App Direction

Favor building an administration console with views such as:

- Cluster and node overview
- VM and LXC/container inventory
- Storage management
- Network configuration views
- Backup and restore status
- High availability and replication status
- Repository and update status
- Disk, ZFS, BTRFS, Ceph, and host health views
- Task history, logs, alerts, and operational details

Prefer information-dense, operational UI patterns over decorative or consumer-style layouts.

## Visual Direction

- The look and feel should take inspiration from the Discord mobile app: dense but readable panels, layered surfaces, clear hierarchy, and polished motion, without copying Discord branding or assets.
- Dark mode should be the default theme.
- Use smooth, purposeful animations for navigation, panel transitions, loading states, and status changes.
- Favor a cohesive theming system with reusable design tokens for color, spacing, radius, elevation, and motion.
- Use Chart.js where it helps communicate system stability, utilization, health trends, task throughput, storage growth, and other operational metrics.

## Coding Guidance

- Use Lit components and TypeScript throughout.
- Use NestJS for the BFF/backend so the server architecture stays structured, typed, and modular.
- Use `@lit-labs/router` as the routing solution for in-app navigation.
- Manage top-level application state with `@lit-labs/preact-signals`.
- Keep state management scoped appropriately: use shared top-level signals for cross-view or app-wide state, and keep local component state local when it does not need to be global.
- Components should handle internal state in a DRY, minimal way rather than duplicating state logic across the tree.
- Use `@lit/task` for handling async tasks and request lifecycle state in components.
- Use Effect where it improves typing, state modeling, data flow, error handling, or service boundaries, and follow the guidance from `effect-llms-full.txt`.
- Prefer small, composable custom elements over one large monolithic component.
- Keep components small, lean, human-readable, and reusable.
- Split complex screens into focused view, panel, table, badge, and form components instead of growing large render methods.
- Keep domain models and data transformation logic separate from rendering code.
- Keep business logic out of presentational components and workerize it with Web Workers wherever practical, especially for data transformation, synchronization, indexing, filtering, and long-running background tasks.
- Use IndexedDB for persisted client-side data, caches, offline state, and durable UI preferences.
- Use Prisma ORM for server-side database schema, local persistence, and migrations in the BFF when structured application data needs to be stored outside the browser.
- Treat Prisma and IndexedDB as separate layers: Prisma for local server-side storage, IndexedDB for browser-side persistence.
- Structure backend code around NestJS modules, controllers, providers, DTOs, and guards where appropriate.
- If the backend is not implemented yet, use realistic typed mock data and adapter layers so the UI can later connect to a real API without major rewrites.
- Replace starter content completely. Do not keep Vite or Lit demo logos, counters, or placeholder tutorial copy.
- Keep code strongly typed and model Proxmox concepts explicitly.
- Favor predictable state flow and clear component APIs.
- Keep styling maintainable and purposeful; avoid default starter styles.

## Verification Workflow

**Always run `yarn verify` during all feature development to ensure you are meeting all project requirements.** This command runs lint, build, and test for all packages and should be used before every commit, PR, or merge.

## Development Workflow

- Develop types first for each feature and component set.
- Write tests before implementation whenever practical, especially for domain models, adapters, utilities, and non-trivial UI behavior.
- Implement components only after the relevant types and tests are in place.
- For new UI work, define the Proxmox domain model, then the component contract, then the tests, then the implementation.
- Prefer implementations that are easy to read and review over clever abstractions.

## UX Guidance

- Design for system administration tasks first.
- Prefer tables, detail panels, status badges, health indicators, logs, and forms that reflect real admin workflows.
- Make dense information feel navigable on smaller screens, especially in layouts that should feel good on mobile-sized viewports.
- Surface warnings and destructive actions clearly.
- Use concise, technical language rather than marketing copy.
- Desktop-first is acceptable, but layouts should still function on narrower screens.
- Accessibility matters: semantic structure, keyboard support, visible focus states, and sufficient contrast are required.

## Feature Modeling Guidance

When implementing features, mirror Proxmox concepts from the reference document rather than abstracting them into generic cloud terminology.

Examples of useful domain types and UI sections include:

- Nodes, clusters, guests, and guest types
- Storage backends such as directory, LVM, ZFS, NFS, CIFS, Ceph RBD, and CephFS
- Network bridges, bonds, VLANs, routed networking, and NAT/masquerading
- Backup jobs, restore flows, retention, and snapshot-related status
- Package repositories, enterprise versus no-subscription configuration, and update health
- Host filesystem and storage details such as ZFS pools, ARC limits, BTRFS subvolumes, and SMART health
- Time sync, firewall status, Wake-on-LAN, and node management operations

## Implementation Preferences

- Prefer creating new files under organized folders as the app grows, for example `src/components`, `src/features`, `src/data`, `src/types`, and `src/styles`.
- Keep NestJS backend modules and data-access code isolated under the server codebase with clear boundaries between transport, application logic, and persistence.
- If Effect usage grows, keep schemas, services, and effectful workflows organized in predictable folders and separate from presentational components.
- Prefer a structure that also leaves room for `src/state`, `src/workers`, and `src/persistence` as those concerns grow.
- If server persistence is introduced, keep Prisma schema and data-access logic isolated under the server codebase rather than mixing it into frontend components.
- Keep chart configuration, metric adapters, and visualization helpers isolated from presentation components.
- Keep mock data close to feature modules unless shared broadly.
- Centralize repeated colors, spacing, and typography choices.
- Use loading, empty, error, and degraded states in admin views.
- When summarizing capabilities in the UI, ensure the copy stays grounded in the reference document.

## What To Avoid

- Do not generate generic SaaS boilerplate.
- Do not describe Proxmox as if it were a public-cloud platform.
- Do not add features purely because they are common in admin templates if they are not relevant to Proxmox administration.
- Do not move all state into global stores when component-local state is sufficient.
- Do not put heavy business logic directly into UI components when it can run in a worker.
- Do not use ad hoc browser storage for persisted application data when IndexedDB is the appropriate durable store.
- Do not attempt to use Prisma as a browser-side ORM for IndexedDB; Prisma should be used on the server side only.
- Do not copy Discord brand assets, copy, or exact UI details; only use it as a feel reference for density, navigation, and motion quality.
- Do not hide important operational detail behind excessive animation or oversized hero sections.
- Do not treat this app like a tutorial project.

## Default Behavior For Future Changes

When asked to add a new screen or feature:

1. Check whether the capability is described in `./.github/llmstxt/proxmox-llms-full.txt`.
2. Consult `./.github/llmstxt/lit_full.txt` for Lit implementation patterns.
3. If backend or BFF work is involved, consult `./.github/llmstxt/nestjs_full.txt` and follow NestJS patterns consistently.
4. If Effect is relevant to the solution, consult `./.github/llmstxt/effect-llms-full.txt` and use its patterns consistently.
5. Model the UI around real Proxmox objects and workflows.
6. Define the types first.
7. Add or update tests before implementation where practical.
8. Decide what state is global versus component-local and use `@lit-labs/preact-signals` only where shared state is warranted.
9. Decide what business logic and background work should live in Web Workers.
10. Use IndexedDB for any persistence requirements on the client.
11. If server-side persistence is required, define a Prisma schema and keep that data local to the BFF's database layer.
12. Use Chart.js where charts materially improve operational visibility.
13. Build the feature in a way that can later connect to live Proxmox API data.
14. Keep the result operational, typed, easy to extend, and composed of small readable components.

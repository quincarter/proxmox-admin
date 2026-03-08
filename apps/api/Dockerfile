# ── Stage 1: install & build ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy Yarn 4 release binary and workspace config first to maximise layer cache
COPY .yarn/releases/ .yarn/releases/
COPY .yarnrc.yml package.json yarn.lock ./

# Copy every workspace manifest so Yarn resolves inter-workspace deps correctly
COPY apps/api/package.json     apps/api/package.json
COPY apps/web/package.json     apps/web/package.json
COPY apps/worker/package.json  apps/worker/package.json
COPY packages/types/package.json packages/types/package.json

RUN node .yarn/releases/yarn-4.13.0.cjs install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY apps/api       apps/api
COPY packages/types packages/types

# Build types package first — API imports @proxmox-admin/types which resolves
# to ./dist/index.d.ts, so the package must be compiled before nest build runs.
RUN cd packages/types && npm run build

# Generate Prisma client (resolved from monorepo root so node_modules symlinks work)
RUN node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma

# Build NestJS app (nest build reads nest-cli.json in apps/api)
RUN cd apps/api && npm run build

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy the full hoisted node_modules (includes Prisma client, NestJS runtime deps, etc.)
COPY --from=builder /app/node_modules         ./node_modules

# Copy the workspace package symlink target so Node can resolve @proxmox-admin/types
COPY --from=builder /app/packages/types       ./packages/types

# Application artefacts
COPY --from=builder /app/apps/api/dist        ./apps/api/dist
COPY apps/api/prisma                          ./apps/api/prisma
COPY apps/api/package.json                   ./apps/api/package.json

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]

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

# Copy source (vite resolves @proxmox-admin/types via the alias in vite.config.ts)
COPY tsconfig.json ./
COPY apps/web       apps/web
COPY packages/types packages/types

# Build types package first — vite resolves @proxmox-admin/types via a path alias
# but tsc (run as part of the build script) needs the compiled declarations.
RUN cd packages/types && npm run build

# Run the standard build script: tsc type-check + vite bundle
RUN cd apps/web && npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

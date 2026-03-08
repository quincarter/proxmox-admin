#!/usr/bin/env bash
# dev-up.sh — Spin up the proxmox-admin local environment.
#
# Usage:
#   ./scripts/dev-up.sh              # infra only (postgres + redis)
#   ./scripts/dev-up.sh --full       # infra + api + web
#   ./scripts/dev-up.sh --worker     # infra + worker (requires PROXMOX_* vars)
#   ./scripts/dev-up.sh --all        # everything including worker + caddy
#   ./scripts/dev-up.sh --down       # tear down all containers
#   ./scripts/dev-up.sh --logs       # follow logs for running stack
#
# Environment:
#   Copy .env.example to .env and fill in PROXMOX_* values before using --worker.

set -euo pipefail

COMPOSE="docker compose"
PROFILES=()
MODE="infra"

for arg in "$@"; do
  case "$arg" in
    --full)    MODE="full" ;;
    --worker)  MODE="worker" ;;
    --all)     MODE="all" ;;
    --down)    MODE="down" ;;
    --logs)    MODE="logs" ;;
    --help|-h)
      sed -n '/^# Usage:/,/^[^#]/p' "$0" | head -n -1 | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

# ── Load .env if present ──────────────────────────────────────────────────────
if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

# ── Mode dispatch ─────────────────────────────────────────────────────────────
case "$MODE" in
  down)
    echo "▼  Tearing down all containers..."
    $COMPOSE --profile worker --profile caddy down
    exit 0
    ;;
  logs)
    $COMPOSE --profile worker --profile caddy logs -f
    exit 0
    ;;
  infra)
    echo "▶  Starting infrastructure (postgres + redis)..."
    $COMPOSE up -d postgres redis
    ;;
  full)
    echo "▶  Starting full stack (infra + api + web)..."
    $COMPOSE up -d postgres redis api web
    ;;
  worker)
    if [[ -z "${PROXMOX_HOST:-}" ]]; then
      echo "⚠  PROXMOX_HOST is not set. Set it in .env or export it before running." >&2
      echo "   The worker will start but will not poll until PROXMOX_HOST is provided." >&2
    fi
    echo "▶  Starting infra + worker..."
    $COMPOSE --profile worker up -d postgres redis worker
    ;;
  all)
    if [[ -z "${PROXMOX_HOST:-}" ]]; then
      echo "⚠  PROXMOX_HOST is not set — worker will not poll." >&2
    fi
    echo "▶  Starting everything (infra + api + web + worker + caddy)..."
    $COMPOSE --profile worker --profile caddy up -d
    ;;
esac

# ── Health wait ───────────────────────────────────────────────────────────────
echo ""
echo "⏳  Waiting for services to be healthy..."

wait_healthy() {
  local svc="$1"
  local retries=20
  until [[ "$($COMPOSE ps -q "$svc" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null)" == "healthy" ]]; do
    retries=$((retries - 1))
    if [[ $retries -eq 0 ]]; then
      echo "  ✗  $svc did not become healthy in time" >&2
      return 1
    fi
    sleep 2
  done
  echo "  ✓  $svc healthy"
}

wait_healthy postgres
wait_healthy redis

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "✅  Local environment is up."
echo ""

case "$MODE" in
  infra)
    echo "  Postgres  → localhost:5432"
    echo "  Redis     → localhost:6379"
    echo ""
    echo "  Run the app locally:  yarn dev"
    echo "  Run with api+web:     $0 --full"
    ;;
  full)
    echo "  Postgres  → localhost:5432"
    echo "  Redis     → localhost:6379"
    echo "  API       → http://localhost:3000"
    echo "  Web       → http://localhost:5173"
    ;;
  worker)
    echo "  Postgres  → localhost:5432"
    echo "  Redis     → localhost:6379"
    echo "  Worker    → polling every ${POLL_INTERVAL_MS:-15000}ms"
    ;;
  all)
    echo "  Postgres  → localhost:5432"
    echo "  Redis     → localhost:6379"
    echo "  API       → http://localhost:3000"
    echo "  Web       → http://localhost:5173"
    echo "  Caddy     → https://localhost"
    echo "  Worker    → polling every ${POLL_INTERVAL_MS:-15000}ms"
    ;;
esac

echo ""
echo "  Logs:      $0 --logs"
echo "  Tear down: $0 --down"

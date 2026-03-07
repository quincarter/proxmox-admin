import { signal, computed } from "@lit-labs/preact-signals";
import type { ServerConnection } from "@proxmox-admin/types";

// ── Auth / Session ────────────────────────────────────────────────────────────

export interface SessionState {
  username: string;
  realm: string;
  server: ServerConnection;
  expiresAt: number;
}

export const session = signal<SessionState | null>(null);
export const isAuthenticated = computed(() => session.value !== null);

// ── Navigation ────────────────────────────────────────────────────────────────

export type AppRoute =
  | "login"
  | "dashboard"
  | "nodes"
  | "node-detail"
  | "lxc"
  | "lxc-detail"
  | "storage"
  | "storage-detail";

export const currentRoute = signal<AppRoute>("login");

// ── Global UI ─────────────────────────────────────────────────────────────────

export const sidebarOpen = signal<boolean>(true);

/** Active toast messages */
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}
export const toasts = signal<Toast[]>([]);

let toastCounter = 0;

export function addToast(
  type: Toast["type"],
  message: string,
  durationMs = 4000,
): void {
  const id = `t-${++toastCounter}`;
  toasts.value = [...toasts.value, { id, type, message }];
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, durationMs);
}

export function clearSession(): void {
  session.value = null;
  currentRoute.value = "login";
}

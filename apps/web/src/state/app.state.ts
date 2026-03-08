import { signal, computed } from "@lit-labs/preact-signals";
import type { ServerConnection } from "@proxmox-admin/types";
import { disconnectEventStream } from "../app/event-stream";

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

/**
 * Navigate to a URL path. Updates the browser address bar and triggers the
 * @lit-labs/router via a synthetic popstate event.
 */
export function navigate(path: string): void {
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

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
  disconnectEventStream();
  session.value = null;
  navigate("/login");
}

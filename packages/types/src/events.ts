// Server-Sent Event types for realtime Proxmox monitoring
// Events flow: Worker → Redis → BFF EventsModule → SSE → Browser SharedWorker → Tabs

import type { NodeSummary } from "./proxmox/node";
import type { AnyGuest } from "./proxmox/guest";
import type { StorageSummary } from "./proxmox/storage";
import type { TaskSummary } from "./proxmox/task";

// ── Event type discriminators ─────────────────────────────────────────────────

export type SseEventType =
  | "node-status"
  | "guest-status"
  | "storage-update"
  | "task-update"
  | "heartbeat"
  | "connected";

// ── Typed event payloads ──────────────────────────────────────────────────────

export interface SseNodeStatusEvent {
  type: "node-status";
  nodes: NodeSummary[];
  timestamp: number;
}

export interface SseGuestStatusEvent {
  type: "guest-status";
  guests: AnyGuest[];
  /** Proxmox node name these guests belong to */
  node: string;
  timestamp: number;
}

export interface SseStorageUpdateEvent {
  type: "storage-update";
  storage: StorageSummary[];
  node: string;
  timestamp: number;
}

export interface SseTaskUpdateEvent {
  type: "task-update";
  tasks: TaskSummary[];
  node: string;
  timestamp: number;
}

export interface SseHeartbeatEvent {
  type: "heartbeat";
  timestamp: number;
}

export interface SseConnectedEvent {
  type: "connected";
  /** Server-assigned unique ID for this SSE connection */
  clientId: string;
  timestamp: number;
}

export type SseEvent =
  | SseNodeStatusEvent
  | SseGuestStatusEvent
  | SseStorageUpdateEvent
  | SseTaskUpdateEvent
  | SseHeartbeatEvent
  | SseConnectedEvent;

// ── SharedWorker bridge message protocol ─────────────────────────────────────
// Used between browser tabs and the events-sse SharedWorker.

/** Messages sent from a tab TO the SharedWorker */
export type SseWorkerInbound = { type: "subscribe" } | { type: "unsubscribe" };

/** Messages sent FROM the SharedWorker TO a tab */
export type SseWorkerOutbound =
  | { type: "event"; event: SseEvent }
  | { type: "connected"; clientId: string }
  | { type: "error"; message: string }
  | { type: "reconnecting" };

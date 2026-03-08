// event-stream.ts — Reactive bridge between the SSE SharedWorker and
// Lit component state. Exposes preact-signals that auto-update when the
// BFF pushes realtime Proxmox events through the SSE stream.

import { signal } from "@lit-labs/preact-signals";
import type {
  SseEvent,
  SseWorkerInbound,
  SseWorkerOutbound,
  NodeSummary,
  AnyGuest,
  StorageSummary,
  TaskSummary,
} from "@proxmox-admin/types";

// ── Realtime state signals ────────────────────────────────────────────────────

/** Current status of the SSE connection */
export const sseStatus = signal<
  "connecting" | "connected" | "reconnecting" | "error"
>("connecting");

/** SSE client ID assigned by the BFF for this connection */
export const sseClientId = signal<string>("");

/** Latest node list from the polling worker — null until first event */
export const liveNodes = signal<NodeSummary[] | null>(null);

/** Latest guests per node — key is node name */
export const liveGuests = signal<Map<string, AnyGuest[]>>(new Map());

/** Latest storage per node — key is node name */
export const liveStorage = signal<Map<string, StorageSummary[]>>(new Map());

/** Latest recent tasks per node — key is node name */
export const liveTasks = signal<Map<string, TaskSummary[]>>(new Map());

/** Timestamp of the most recent event received */
export const lastEventAt = signal<number | null>(null);

// ── Worker lifecycle ──────────────────────────────────────────────────────────

let worker: SharedWorker | null = null;

/** Connect to the events SSE stream. Safe to call multiple times; idempotent. */
export function connectEventStream(): void {
  if (worker) return;

  worker = new SharedWorker(
    new URL("../workers/events-sse.worker.ts", import.meta.url),
    { type: "module", name: "pxa-events-sse" },
  );

  worker.port.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data as SseWorkerOutbound;
    handleWorkerMessage(msg);
  });

  worker.port.addEventListener("messageerror", () => {
    sseStatus.value = "error";
  });

  worker.port.start();

  worker.port.postMessage({ type: "subscribe" } satisfies SseWorkerInbound);
}

/** Disconnect from the SSE stream (e.g. on logout). */
export function disconnectEventStream(): void {
  if (!worker) return;
  worker.port.postMessage({ type: "unsubscribe" } satisfies SseWorkerInbound);
  worker.port.close();
  worker = null;
  sseStatus.value = "connecting";
  sseClientId.value = "";
}

// ── Event handler ─────────────────────────────────────────────────────────────

function handleWorkerMessage(msg: SseWorkerOutbound): void {
  switch (msg.type) {
    case "connected":
      sseStatus.value = "connected";
      sseClientId.value = msg.clientId;
      break;

    case "reconnecting":
      sseStatus.value = "reconnecting";
      break;

    case "error":
      sseStatus.value = "error";
      break;

    case "event":
      applyEvent(msg.event);
      break;
  }
}

function applyEvent(event: SseEvent): void {
  lastEventAt.value = event.timestamp;

  switch (event.type) {
    case "node-status":
      liveNodes.value = event.nodes;
      break;

    case "guest-status": {
      const guests = new Map(liveGuests.value);
      guests.set(event.node, event.guests);
      liveGuests.value = guests;
      break;
    }

    case "storage-update": {
      const storage = new Map(liveStorage.value);
      storage.set(event.node, event.storage);
      liveStorage.value = storage;
      break;
    }

    case "task-update": {
      const tasks = new Map(liveTasks.value);
      tasks.set(event.node, event.tasks);
      liveTasks.value = tasks;
      break;
    }

    case "heartbeat":
      // Heartbeats only update `lastEventAt`, no data change
      break;

    case "connected":
      // Handled in handleWorkerMessage
      break;
  }
}

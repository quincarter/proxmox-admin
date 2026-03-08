/// <reference lib="webworker" />
// SharedWorker: opens a single EventSource to /api/events/stream and fans the
// events out to all connected browser tabs. This avoids N independent SSE
// connections (one per tab) and plays nicely with HTTP/2 multiplexing.

import type {
  SseEvent,
  SseEventType,
  SseWorkerInbound,
  SseWorkerOutbound,
} from "@proxmox-admin/types";

// ── State ────────────────────────────────────────────────────────────────────

const ports: MessagePort[] = [];
let eventSource: EventSource | null = null;
let connectedClientId = "";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function broadcast(msg: SseWorkerOutbound): void {
  for (const port of ports) {
    port.postMessage(msg);
  }
}

function removePort(port: MessagePort): void {
  const idx = ports.indexOf(port);
  if (idx !== -1) ports.splice(idx, 1);
  if (ports.length === 0) {
    // No tabs remain — tear down the EventSource to avoid keeping the
    // server-side subscription alive with no consumers.
    disconnect();
  }
}

function disconnect(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  connectedClientId = "";
}

// ── SSE connection ─────────────────────────────────────────────────────────────

const EVENT_TYPES: SseEventType[] = [
  "node-status",
  "guest-status",
  "storage-update",
  "task-update",
  "heartbeat",
];

function connect(): void {
  if (eventSource) return;

  eventSource = new EventSource("/api/events/stream", {
    withCredentials: true,
  });

  // "connected" is the first event emitted by the BFF on each new connection
  eventSource.addEventListener("connected", (e: Event) => {
    const data = JSON.parse((e as MessageEvent<string>).data) as SseEvent;
    if (data.type === "connected") {
      connectedClientId = data.clientId;
      broadcast({ type: "connected", clientId: data.clientId });
    }
  });

  // Forward all named Proxmox events to all tabs
  for (const evtType of EVENT_TYPES) {
    eventSource.addEventListener(evtType, (e: Event) => {
      const event = JSON.parse((e as MessageEvent<string>).data) as SseEvent;
      broadcast({ type: "event", event });
    });
  }

  eventSource.onerror = () => {
    broadcast({ type: "reconnecting" });
    // Close the broken connection — onerror doesn't auto-close in all browsers
    eventSource?.close();
    eventSource = null;
    connectedClientId = "";
    // Exponential back-off is not strictly necessary for SSE (the browser
    // will usually retry at ~3 s), but we control reconnect ourselves so we
    // can broadcast the "reconnecting" state and re-register listeners.
    reconnectTimer = setTimeout(connect, 5_000);
  };
}

// ── Port management ────────────────────────────────────────────────────────────

(self as unknown as SharedWorkerGlobalScope).addEventListener(
  "connect",
  (e: Event) => {
    const port = (e as MessageEvent).ports[0];
    ports.push(port);

    port.addEventListener("message", (msg: MessageEvent) => {
      const data = msg.data as SseWorkerInbound;
      if (data.type === "subscribe") {
        // Kick off the EventSource if it isn't already running
        if (!eventSource) connect();
        // If we're already connected, immediately tell this port
        if (connectedClientId) {
          port.postMessage({
            type: "connected",
            clientId: connectedClientId,
          } satisfies SseWorkerOutbound);
        }
      } else if (data.type === "unsubscribe") {
        removePort(port);
      }
    });

    port.start();
  },
);

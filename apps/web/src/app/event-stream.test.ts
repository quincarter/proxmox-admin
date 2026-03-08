// Tests for the reactive event-stream signal bridge.
// SharedWorker is not available in happy-dom; we stub it via vi.stubGlobal
// so we can verify that connectEventStream() wires up port handlers correctly,
// and then drive signals through the captured message handler.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SseWorkerOutbound, SseEvent } from "@proxmox-admin/types";

// ── SharedWorker stub ─────────────────────────────────────────────────────────

interface MockPort {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  postMessage: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

let mockPort: MockPort;
let MockSharedWorkerClass: ReturnType<typeof vi.fn>;

function buildMocks() {
  mockPort = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    postMessage: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
  };
  // Must be a regular function (not arrow) so vi.fn() can use Reflect.construct
  // when event-stream.ts calls `new SharedWorker(...)`.
  MockSharedWorkerClass = vi.fn(function MockSharedWorkerInstance() {
    return { port: mockPort };
  } as unknown as () => { port: MockPort });
  vi.stubGlobal("SharedWorker", MockSharedWorkerClass);
}

// Retrieve the "message" handler registered by connectEventStream() on the
// mock port so tests can drive events through it.
function captureMessageHandler(): (e: MessageEvent) => void {
  const calls = mockPort.addEventListener.mock.calls as Array<
    [string, (e: MessageEvent) => void]
  >;
  const entry = calls.find(([event]) => event === "message");
  if (!entry) throw new Error("No 'message' listener registered on port");
  return entry[1];
}

// ── Module under test — re-imported for each test file (Vitest isolates) ──────

// We import lazily inside beforeEach via dynamic import so each test set
// starts with a fresh module (Vitest isolates each test FILE, not each test).
// For tests within the same file we reset module state by calling disconnect.
import {
  connectEventStream,
  disconnectEventStream,
  sseStatus,
  sseClientId,
  liveNodes,
  liveGuests,
  liveStorage,
  liveTasks,
  lastEventAt,
} from "./event-stream.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetSignals() {
  sseStatus.value = "connecting";
  sseClientId.value = "";
  liveNodes.value = null;
  liveGuests.value = new Map();
  liveStorage.value = new Map();
  liveTasks.value = new Map();
  lastEventAt.value = null;
}

function sendMessage(msg: SseWorkerOutbound) {
  const handler = captureMessageHandler();
  handler(new MessageEvent("message", { data: msg }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("event-stream", () => {
  beforeEach(() => {
    buildMocks();
    resetSignals();
  });

  afterEach(() => {
    disconnectEventStream();
    vi.unstubAllGlobals();
  });

  // ── connectEventStream ──────────────────────────────────────────────────────

  describe("connectEventStream()", () => {
    it("creates a SharedWorker on first call", () => {
      connectEventStream();
      expect(MockSharedWorkerClass).toHaveBeenCalledTimes(1);
    });

    it("is idempotent — calling twice does not create a second worker", () => {
      connectEventStream();
      connectEventStream();
      expect(MockSharedWorkerClass).toHaveBeenCalledTimes(1);
    });

    it("starts the port and subscribes", () => {
      connectEventStream();
      expect(mockPort.start).toHaveBeenCalledTimes(1);
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "subscribe" }),
      );
    });
  });

  // ── disconnectEventStream ───────────────────────────────────────────────────

  describe("disconnectEventStream()", () => {
    it("closes the port and unsubscribes", () => {
      connectEventStream();
      disconnectEventStream();
      expect(mockPort.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "unsubscribe" }),
      );
      expect(mockPort.close).toHaveBeenCalledTimes(1);
    });

    it("resets sseStatus to 'connecting' and sseClientId to empty", () => {
      connectEventStream();
      sseStatus.value = "connected";
      sseClientId.value = "abc-123";
      disconnectEventStream();
      expect(sseStatus.value).toBe("connecting");
      expect(sseClientId.value).toBe("");
    });

    it("is safe to call when not connected", () => {
      expect(() => disconnectEventStream()).not.toThrow();
    });
  });

  // ── handleWorkerMessage — 'connected' ───────────────────────────────────────

  describe("'connected' worker message", () => {
    it("sets sseStatus to 'connected'", () => {
      connectEventStream();
      sendMessage({ type: "connected", clientId: "client-xyz" });
      expect(sseStatus.value).toBe("connected");
    });

    it("stores the clientId in sseClientId signal", () => {
      connectEventStream();
      sendMessage({ type: "connected", clientId: "client-xyz" });
      expect(sseClientId.value).toBe("client-xyz");
    });
  });

  describe("'reconnecting' worker message", () => {
    it("sets sseStatus to 'reconnecting'", () => {
      connectEventStream();
      sendMessage({ type: "reconnecting" });
      expect(sseStatus.value).toBe("reconnecting");
    });
  });

  describe("'error' worker message", () => {
    it("sets sseStatus to 'error'", () => {
      connectEventStream();
      sendMessage({ type: "error", message: "EventSource failed" });
      expect(sseStatus.value).toBe("error");
    });
  });

  // ── applyEvent via 'event' worker message ───────────────────────────────────

  describe("'event' worker message — node-status", () => {
    it("updates liveNodes signal", () => {
      connectEventStream();
      const nodes = [
        {
          node: "pve",
          status: "online",
          id: "node/pve",
          type: "node" as const,
        },
      ];
      const event: SseEvent = {
        type: "node-status",
        nodes,
        timestamp: 100,
      } as SseEvent;
      sendMessage({ type: "event", event });
      expect(liveNodes.value).toEqual(nodes);
    });

    it("updates lastEventAt", () => {
      connectEventStream();
      const nodes = [
        {
          node: "pve",
          status: "online",
          id: "node/pve",
          type: "node" as const,
        },
      ];
      const event: SseEvent = {
        type: "node-status",
        nodes,
        timestamp: 999,
      } as SseEvent;
      sendMessage({ type: "event", event });
      expect(lastEventAt.value).toBe(999);
    });
  });

  describe("'event' worker message — guest-status", () => {
    it("adds guests keyed by node name to liveGuests", () => {
      connectEventStream();
      const guests = [
        {
          vmid: 100,
          name: "ct-100",
          node: "pve",
          type: "lxc" as const,
          status: "running",
        },
      ];
      const event: SseEvent = {
        type: "guest-status",
        guests,
        node: "pve",
        timestamp: 200,
      } as SseEvent;
      sendMessage({ type: "event", event });
      expect(liveGuests.value.get("pve")).toEqual(guests);
    });

    it("accumulates guests for multiple nodes", () => {
      connectEventStream();
      const pveGuests = [
        {
          vmid: 100,
          name: "ct-100",
          node: "pve",
          type: "lxc" as const,
          status: "running",
        },
      ];
      const node2Guests = [
        {
          vmid: 200,
          name: "vm-200",
          node: "pve2",
          type: "qemu" as const,
          status: "stopped",
        },
      ];
      sendMessage({
        type: "event",
        event: {
          type: "guest-status",
          guests: pveGuests,
          node: "pve",
          timestamp: 201,
        } as SseEvent,
      });
      sendMessage({
        type: "event",
        event: {
          type: "guest-status",
          guests: node2Guests,
          node: "pve2",
          timestamp: 202,
        } as SseEvent,
      });
      expect(liveGuests.value.size).toBe(2);
      expect(liveGuests.value.get("pve2")).toEqual(node2Guests);
    });
  });

  describe("'event' worker message — storage-update", () => {
    it("updates liveStorage keyed by node name", () => {
      connectEventStream();
      const storage = [{ storage: "local", type: "dir" }];
      const event: SseEvent = {
        type: "storage-update",
        storage,
        node: "pve",
        timestamp: 300,
      } as SseEvent;
      sendMessage({ type: "event", event });
      expect(liveStorage.value.get("pve")).toEqual(storage);
    });
  });

  describe("'event' worker message — task-update", () => {
    it("updates liveTasks keyed by node name", () => {
      connectEventStream();
      const tasks = [{ upid: "UPID:pve:0001:qmstart", node: "pve" }];
      const event: SseEvent = {
        type: "task-update",
        tasks,
        node: "pve",
        timestamp: 400,
      } as SseEvent;
      sendMessage({ type: "event", event });
      expect(liveTasks.value.get("pve")).toEqual(tasks);
    });
  });

  describe("'event' worker message — heartbeat", () => {
    it("only updates lastEventAt, not any data signal", () => {
      connectEventStream();
      const event: SseEvent = {
        type: "heartbeat",
        timestamp: 500,
      } as SseEvent;
      sendMessage({ type: "event", event });
      expect(lastEventAt.value).toBe(500);
      expect(liveNodes.value).toBeNull();
      expect(liveGuests.value.size).toBe(0);
    });
  });
});

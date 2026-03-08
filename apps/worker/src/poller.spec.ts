import { Poller } from "./poller";
import type { WorkerConfig } from "./config";
import type { Publisher } from "./publisher";
import type { ProxmoxSession } from "./proxmox-client";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<WorkerConfig> = {}): WorkerConfig {
  return {
    proxmoxHost: "192.168.1.10",
    proxmoxPort: 8006,
    proxmoxUser: "root",
    proxmoxPass: "secret",
    proxmoxRealm: "pam",
    tlsRejectUnauthorized: false,
    redisUrl: "redis://localhost:6379",
    pollIntervalMs: 15_000,
    logLevel: "info",
    ...overrides,
  };
}

function makeFakeSession(ttlMs = 60 * 60 * 1000): ProxmoxSession {
  return {
    ticket: "PVE:root@pam:DEADBEEF",
    csrfToken: "CSRF",
    username: "root@pam",
    expiresAt: Date.now() + ttlMs,
  };
}

const FAKE_NODES = [
  { node: "pve", status: "online", id: "node/pve", type: "node" as const },
];

const FAKE_GUESTS = [
  {
    vmid: 100,
    name: "ct-100",
    node: "pve",
    type: "lxc" as const,
    status: "running",
  },
];

const FAKE_STORAGE = [{ storage: "local", type: "dir" }];

const FAKE_TASKS = [{ upid: "UPID:pve:1234:qmstart", node: "pve" }];

// Returns mock sequences for a single successful node poll cycle:
// /nodes → FAKE_NODES, then for each online node: resources → FAKE_GUESTS,
// storage → FAKE_STORAGE, tasks → FAKE_TASKS.
function mockOnePollCycle(
  mockGet: jest.Mock,
  guests = FAKE_GUESTS,
  storage = FAKE_STORAGE,
  tasks = FAKE_TASKS,
) {
  mockGet
    .mockResolvedValueOnce(FAKE_NODES)
    .mockResolvedValueOnce(guests)
    .mockResolvedValueOnce(storage)
    .mockResolvedValueOnce(tasks);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Poller", () => {
  let mockPublisher: jest.Mocked<Publisher>;
  let mockAuthenticate: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPublisher = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      publishNodes: jest.fn().mockResolvedValue(undefined),
      publishGuests: jest.fn().mockResolvedValue(undefined),
      publishStorage: jest.fn().mockResolvedValue(undefined),
      publishTasks: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Publisher>;

    mockAuthenticate = jest.fn().mockResolvedValue(makeFakeSession());
    mockGet = jest.fn();
  });

  function makePoller(config?: Partial<WorkerConfig>): Poller {
    const poller = new Poller(makeConfig(config), mockPublisher);
    // Reach into the private ProxmoxClient and replace it with a mock
    (poller as unknown as { client: unknown }).client = {
      authenticate: mockAuthenticate,
      get: mockGet,
    };
    return poller;
  }

  describe("poll()", () => {
    it("authenticates and publishes node-status on first poll", async () => {
      mockOnePollCycle(mockGet);
      const poller = makePoller();
      await poller.poll();

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
      expect(mockPublisher.publishNodes).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "node-status",
          nodes: FAKE_NODES,
        }),
      );
    });

    it("publishes guest-status for online nodes", async () => {
      mockOnePollCycle(mockGet);
      const poller = makePoller();
      await poller.poll();

      expect(mockPublisher.publishGuests).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "guest-status",
          guests: FAKE_GUESTS,
          node: "pve",
        }),
      );
    });

    it("publishes storage-update for online nodes", async () => {
      mockOnePollCycle(mockGet);
      const poller = makePoller();
      await poller.poll();

      expect(mockPublisher.publishStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "storage-update",
          storage: FAKE_STORAGE,
          node: "pve",
        }),
      );
    });

    it("publishes task-update for online nodes", async () => {
      mockOnePollCycle(mockGet);
      const poller = makePoller();
      await poller.poll();

      expect(mockPublisher.publishTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "task-update",
          tasks: FAKE_TASKS,
          node: "pve",
        }),
      );
    });

    it("skips per-node polling for offline nodes", async () => {
      mockGet.mockResolvedValueOnce([
        { node: "pve", status: "offline", id: "node/pve", type: "node" },
      ]);

      const poller = makePoller();
      await poller.poll();

      expect(mockPublisher.publishGuests).not.toHaveBeenCalled();
      expect(mockPublisher.publishStorage).not.toHaveBeenCalled();
      expect(mockPublisher.publishTasks).not.toHaveBeenCalled();
    });

    it("does not throw when authentication fails — logs error and returns", async () => {
      mockAuthenticate.mockRejectedValueOnce(new Error("Invalid credentials"));

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const poller = makePoller();
      await expect(poller.poll()).resolves.toBeUndefined();
      expect(mockPublisher.publishNodes).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("re-uses an unexpired session on the second poll", async () => {
      // Both polls succeed; authenticate must only run once
      mockGet
        .mockResolvedValueOnce(FAKE_NODES) // poll 1: /nodes
        .mockResolvedValueOnce([]) // poll 1: resources
        .mockResolvedValueOnce([]) // poll 1: storage
        .mockResolvedValueOnce([]) // poll 1: tasks
        .mockResolvedValueOnce(FAKE_NODES) // poll 2: /nodes
        .mockResolvedValueOnce([]) // poll 2: resources
        .mockResolvedValueOnce([]) // poll 2: storage
        .mockResolvedValueOnce([]); // poll 2: tasks

      const poller = makePoller();
      await poller.poll();
      await poller.poll();

      expect(mockAuthenticate).toHaveBeenCalledTimes(1);
    });

    it("re-authenticates when the stored session is expired", async () => {
      const expiredSession = makeFakeSession(-1); // expired 1 ms ago
      mockAuthenticate
        .mockResolvedValueOnce(expiredSession)
        .mockResolvedValueOnce(makeFakeSession());

      mockGet
        .mockResolvedValueOnce(FAKE_NODES)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(FAKE_NODES)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const poller = makePoller();
      await poller.poll();
      await poller.poll();

      expect(mockAuthenticate).toHaveBeenCalledTimes(2);
    });

    it("forces re-auth on the next cycle after a 401 from /nodes", async () => {
      const err401 = Object.assign(new Error("Unauthorized"), {
        response: { status: 401 },
      });

      mockAuthenticate
        .mockResolvedValueOnce(makeFakeSession()) // poll 1 auth
        .mockResolvedValueOnce(makeFakeSession()); // poll 3 re-auth after 401

      mockGet
        .mockResolvedValueOnce(FAKE_NODES) // poll 1: /nodes OK
        .mockResolvedValueOnce([]) // poll 1: resources
        .mockResolvedValueOnce([]) // poll 1: storage
        .mockResolvedValueOnce([]) // poll 1: tasks
        .mockRejectedValueOnce(err401) // poll 2: /nodes → 401 → clears session
        .mockResolvedValueOnce(FAKE_NODES) // poll 3: /nodes OK
        .mockResolvedValueOnce([]) // poll 3: resources
        .mockResolvedValueOnce([]) // poll 3: storage
        .mockResolvedValueOnce([]); // poll 3: tasks

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const poller = makePoller();
      await poller.poll(); // poll 1 — authenticate once
      await poller.poll(); // poll 2 — reuses session, gets 401, clears session
      await poller.poll(); // poll 3 — re-authenticates

      expect(mockAuthenticate).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it("includes a numeric timestamp on every published event", async () => {
      mockOnePollCycle(mockGet);
      const poller = makePoller();
      await poller.poll();

      const call = mockPublisher.publishNodes.mock.calls[0][0] as {
        timestamp: unknown;
      };
      expect(typeof call.timestamp).toBe("number");
    });
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { firstValueFrom } from "rxjs";
import { take, toArray } from "rxjs/operators";
import { EventsService } from "./events.service";
import Redis from "ioredis";

// We mock ioredis before importing EventsService so the real Redis client
// never attempts a network connection during unit tests.
// The mock must use { __esModule: true, default: ... } because the API tsconfig
// does not have esModuleInterop, so `import Redis from "ioredis"` compiles to
// `ioredis_1.default`.
jest.mock("ioredis", () => {
  const MockRedis = jest.fn().mockImplementation(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const emitter = new (require("events").EventEmitter)();
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      on: (event: string, cb: (...args: unknown[]) => void) =>
        emitter.on(event, cb),
      emit: (event: string, ...args: unknown[]) => emitter.emit(event, ...args),
      // helpers so tests can simulate incoming Redis events
      _simulateMessage: (channel: string, data: string) =>
        emitter.emit("message", channel, data),
      _simulateReady: () => emitter.emit("ready"),
      _simulateError: (err: Error) => emitter.emit("error", err),
    };
  });
  return { __esModule: true, default: MockRedis };
});

describe("EventsService", () => {
  let service: EventsService;

  // ── Without Redis (REDIS_URL not set) ──────────────────────────────────────

  describe("without REDIS_URL", () => {
    beforeEach(async () => {
      delete process.env["REDIS_URL"];
      const module: TestingModule = await Test.createTestingModule({
        providers: [EventsService],
      }).compile();

      service = module.get<EventsService>(EventsService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await service.onModuleDestroy();
    });

    it("reports Redis as unavailable", () => {
      expect(service.isRedisAvailable()).toBe(false);
    });

    it("still emits heartbeat events on the stream", async () => {
      const events = await firstValueFrom(
        service.getEventStream().pipe(take(1), toArray()),
      );
      expect(events).toHaveLength(1);
      const parsed = JSON.parse(events[0].data as string);
      expect(parsed.type).toBe("heartbeat");
      expect(typeof parsed.timestamp).toBe("number");
    });
  });

  // ── With Redis (REDIS_URL set, Redis mocked) ───────────────────────────────

  describe("with REDIS_URL set", () => {
    const RedisMock = Redis as unknown as jest.Mock;

    interface RedisMockInstance {
      subscribe: jest.Mock;
      connect: jest.Mock;
      disconnect: jest.Mock;
      _simulateMessage: (channel: string, data: string) => void;
      _simulateReady: () => void;
      _simulateError: (err: Error) => void;
    }

    let redisInstance: RedisMockInstance;

    beforeEach(async () => {
      process.env["REDIS_URL"] = "redis://localhost:6379";
      RedisMock.mockClear();

      const module: TestingModule = await Test.createTestingModule({
        providers: [EventsService],
      }).compile();

      service = module.get<EventsService>(EventsService);
      await service.onModuleInit();
      redisInstance = RedisMock.mock.results[0].value as RedisMockInstance;
    });

    afterEach(async () => {
      delete process.env["REDIS_URL"];
      await service.onModuleDestroy();
    });

    it("subscribes to all four Proxmox channels", () => {
      expect(redisInstance.subscribe).toHaveBeenCalledWith(
        "pxa:nodes",
        "pxa:guests",
        "pxa:storage",
        "pxa:tasks",
      );
    });

    it("marks Redis as available when the ready event fires", () => {
      redisInstance._simulateReady();
      expect(service.isRedisAvailable()).toBe(true);
    });

    it("forwards a valid pxa:nodes message to the event stream", async () => {
      const payload = {
        type: "node-status",
        nodes: [{ node: "pve", status: "online" }],
        timestamp: Date.now(),
      };

      const resultPromise = firstValueFrom(
        service.getEventStream().pipe(take(1)),
      );

      redisInstance._simulateMessage("pxa:nodes", JSON.stringify(payload));

      const msg = await resultPromise;
      const parsed = JSON.parse(msg.data as string);
      expect(parsed.type).toBe("node-status");
      expect(parsed.nodes[0].node).toBe("pve");
    });

    it("forwards a pxa:guests message to the event stream", async () => {
      const payload = {
        type: "guest-status",
        guests: [{ vmid: 100, name: "ct-100", status: "running", type: "lxc" }],
        node: "pve",
        timestamp: Date.now(),
      };

      const resultPromise = firstValueFrom(
        service.getEventStream().pipe(take(1)),
      );

      redisInstance._simulateMessage("pxa:guests", JSON.stringify(payload));

      const msg = await resultPromise;
      const parsed = JSON.parse(msg.data as string);
      expect(parsed.type).toBe("guest-status");
      expect(parsed.node).toBe("pve");
    });

    it("silently ignores malformed non-JSON messages", async () => {
      // Simulate two messages: first one malformed, second valid
      const valid = JSON.stringify({
        type: "heartbeat",
        timestamp: Date.now(),
      });

      const resultPromise = firstValueFrom(
        service.getEventStream().pipe(take(1)),
      );

      // Malformed should not throw
      expect(() =>
        redisInstance._simulateMessage("pxa:nodes", "NOT JSON {{"),
      ).not.toThrow();

      // Valid message arrives next — heartbeat from timer OR we wait for heartbeat
      // Simply confirm the stream stayed alive by checking the first event type
      redisInstance._simulateMessage("pxa:nodes", valid);
      const msg = await resultPromise;
      expect(msg.type).toBeDefined();
    });

    it("calls disconnect on module destroy", async () => {
      await service.onModuleDestroy();
      expect(redisInstance.disconnect).toHaveBeenCalled();
    });
  });

  // ── getEventStream structure ───────────────────────────────────────────────

  describe("getEventStream()", () => {
    beforeEach(async () => {
      delete process.env["REDIS_URL"];
      const module: TestingModule = await Test.createTestingModule({
        providers: [EventsService],
      }).compile();
      service = module.get<EventsService>(EventsService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await service.onModuleDestroy();
    });

    it("emits MessageEvent objects with data, type, and id fields", async () => {
      const evt = await firstValueFrom(service.getEventStream().pipe(take(1)));
      expect(typeof evt.data).toBe("string");
      expect(typeof evt.type).toBe("string");
      expect(typeof evt.id).toBe("string");
    });

    it("heartbeat events have a numeric timestamp in their data", async () => {
      const evt = await firstValueFrom(service.getEventStream().pipe(take(1)));
      const data = JSON.parse(evt.data as string);
      expect(typeof data.timestamp).toBe("number");
    });
  });
});

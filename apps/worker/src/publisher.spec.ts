// Mock ioredis so no real Redis connection is opened during unit tests.
// The factory returns an object whose methods are jest spies.
const mockRedisInstance = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockResolvedValue(1),
};

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

import { Publisher } from "./publisher";
import Redis from "ioredis";

const MockRedis = Redis as unknown as jest.Mock;
const REDIS_URL = "redis://localhost:6379";

describe("Publisher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-initialise the mock instance methods after clearAllMocks wipes them
    mockRedisInstance.connect.mockResolvedValue(undefined);
    mockRedisInstance.disconnect.mockResolvedValue(undefined);
    mockRedisInstance.publish.mockResolvedValue(1);
  });

  describe("constructor", () => {
    it("creates a Redis instance with lazyConnect enabled", () => {
      new Publisher(REDIS_URL);
      expect(MockRedis).toHaveBeenCalledWith(
        REDIS_URL,
        expect.objectContaining({ lazyConnect: true }),
      );
    });
  });

  describe("connect()", () => {
    it("calls redis.connect()", async () => {
      const pub = new Publisher(REDIS_URL);
      await pub.connect();
      expect(mockRedisInstance.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe("disconnect()", () => {
    it("calls redis.disconnect()", async () => {
      const pub = new Publisher(REDIS_URL);
      await pub.disconnect();
      expect(mockRedisInstance.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("publishNodes()", () => {
    it("publishes to the pxa:nodes channel with JSON payload", async () => {
      const pub = new Publisher(REDIS_URL);
      const payload = { type: "node-status", nodes: [], timestamp: 1234 };
      await pub.publishNodes(payload);

      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        "pxa:nodes",
        JSON.stringify(payload),
      );
    });
  });

  describe("publishGuests()", () => {
    it("publishes to the pxa:guests channel with JSON payload", async () => {
      const pub = new Publisher(REDIS_URL);
      const payload = {
        type: "guest-status",
        guests: [],
        node: "pve",
        timestamp: 1234,
      };
      await pub.publishGuests(payload);

      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        "pxa:guests",
        JSON.stringify(payload),
      );
    });
  });

  describe("publishStorage()", () => {
    it("publishes to the pxa:storage channel with JSON payload", async () => {
      const pub = new Publisher(REDIS_URL);
      const payload = {
        type: "storage-update",
        storage: [],
        node: "pve",
        timestamp: 1234,
      };
      await pub.publishStorage(payload);

      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        "pxa:storage",
        JSON.stringify(payload),
      );
    });
  });

  describe("publishTasks()", () => {
    it("publishes to the pxa:tasks channel with JSON payload", async () => {
      const pub = new Publisher(REDIS_URL);
      const payload = {
        type: "task-update",
        tasks: [],
        node: "pve",
        timestamp: 1234,
      };
      await pub.publishTasks(payload);

      expect(mockRedisInstance.publish).toHaveBeenCalledWith(
        "pxa:tasks",
        JSON.stringify(payload),
      );
    });
  });

  describe("channel isolation", () => {
    it("each publish method uses its own dedicated channel", async () => {
      const pub = new Publisher(REDIS_URL);
      await pub.publishNodes({});
      await pub.publishGuests({});
      await pub.publishStorage({});
      await pub.publishTasks({});

      const channels = mockRedisInstance.publish.mock.calls.map(
        (c: [string, string]) => c[0],
      );
      expect(channels).toEqual([
        "pxa:nodes",
        "pxa:guests",
        "pxa:storage",
        "pxa:tasks",
      ]);
    });

    it("serialises the payload as JSON", async () => {
      const pub = new Publisher(REDIS_URL);
      const payload = { type: "test", value: 42, nested: { ok: true } };
      await pub.publishNodes(payload);

      const sent = mockRedisInstance.publish.mock.calls[0][1] as string;
      expect(JSON.parse(sent)).toEqual(payload);
    });
  });
});

// Redis publisher — wraps ioredis and serialises SSE events to the channels
// the BFF EventsService subscribes to.

import Redis from "ioredis";

// Channel names must match apps/api/src/modules/events/events.service.ts
const CHANNELS = {
  NODES: "pxa:nodes",
  GUESTS: "pxa:guests",
  STORAGE: "pxa:storage",
  TASKS: "pxa:tasks",
} as const;

export class Publisher {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }

  async publishNodes(payload: object): Promise<void> {
    await this.redis.publish(CHANNELS.NODES, JSON.stringify(payload));
  }

  async publishGuests(payload: object): Promise<void> {
    await this.redis.publish(CHANNELS.GUESTS, JSON.stringify(payload));
  }

  async publishStorage(payload: object): Promise<void> {
    await this.redis.publish(CHANNELS.STORAGE, JSON.stringify(payload));
  }

  async publishTasks(payload: object): Promise<void> {
    await this.redis.publish(CHANNELS.TASKS, JSON.stringify(payload));
  }
}

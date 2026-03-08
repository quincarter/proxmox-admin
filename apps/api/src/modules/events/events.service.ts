import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import Redis from "ioredis";
import { Observable, Subject, merge, timer } from "rxjs";
import { map } from "rxjs/operators";
import type { MessageEvent } from "@nestjs/common";
import type { SseEvent } from "@proxmox-admin/types";

// Redis channel names — must match apps/worker/src/publisher.ts
const SSE_CHANNELS = [
  "pxa:nodes",
  "pxa:guests",
  "pxa:storage",
  "pxa:tasks",
] as const;

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private subscriber: Redis | null = null;
  private readonly subject = new Subject<SseEvent>();
  private redisAvailable = false;

  async onModuleInit(): Promise<void> {
    const redisUrl = process.env["REDIS_URL"];
    if (!redisUrl) {
      this.logger.warn(
        "REDIS_URL not set — SSE stream will send heartbeats only",
      );
      return;
    }

    try {
      this.subscriber = new Redis(redisUrl, {
        lazyConnect: true,
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
        retryStrategy: (times) => Math.min(times * 500, 5000),
      });

      this.subscriber.on("error", (err: Error) => {
        this.logger.error(`Redis subscriber error: ${err.message}`);
      });

      this.subscriber.on("ready", () => {
        this.logger.log("Redis subscriber connected");
        this.redisAvailable = true;
      });

      await this.subscriber.connect();
      await this.subscriber.subscribe(...SSE_CHANNELS);

      this.subscriber.on("message", (_channel: string, message: string) => {
        try {
          const event = JSON.parse(message) as SseEvent;
          this.subject.next(event);
        } catch {
          // malformed message — ignore
        }
      });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to connect to Redis: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.disconnect();
    }
  }

  /**
   * Returns an Observable of SSE MessageEvents.
   * Merges Redis-sourced Proxmox events with a 30-second heartbeat
   * to keep the connection alive through proxies and load balancers.
   */
  getEventStream(): Observable<MessageEvent> {
    const events$: Observable<MessageEvent> = this.subject.asObservable().pipe(
      map(
        (event): MessageEvent => ({
          data: JSON.stringify(event),
          type: event.type,
          id: String(Date.now()),
        }),
      ),
    );

    const heartbeat$: Observable<MessageEvent> = timer(0, 30_000).pipe(
      map(
        (): MessageEvent => ({
          data: JSON.stringify({ type: "heartbeat", timestamp: Date.now() }),
          type: "heartbeat",
          id: String(Date.now()),
        }),
      ),
    );

    return merge(events$, heartbeat$);
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }
}

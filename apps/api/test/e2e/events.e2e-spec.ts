import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { EMPTY, Observable, of } from "rxjs";
import { createTestApp, doLogin, MockProxmoxHttp } from "../helpers/test-app";

// ── Mock EventsService ───────────────────────────────────────────────────────

// We override EventsService so the e2e tests never try to open a real Redis
// connection. getEventStream() returns EMPTY so the SSE response finishes
// immediately after the "connected" event emitted by the controller.
const mockEventsService = {
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  getEventStream: jest.fn((): Observable<MessageEvent> => EMPTY),
  isRedisAvailable: jest.fn(() => false),
};

describe("Events SSE endpoints", () => {
  let app: INestApplication;
  let proxmoxHttp: MockProxmoxHttp;
  let cookie: string;

  beforeAll(async () => {
    ({ app, proxmoxHttp } = await createTestApp({
      overrideEventsService: mockEventsService,
    }));
    cookie = await doLogin(app, proxmoxHttp);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockEventsService.getEventStream.mockClear();
    mockEventsService.getEventStream.mockReturnValue(EMPTY);
    proxmoxHttp.get.mockReset();
    proxmoxHttp.post.mockReset();
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  describe("GET /api/events/stream", () => {
    it("returns 401 when no session cookie is provided", async () => {
      await request(app.getHttpServer()).get("/api/events/stream").expect(401);
    });

    it("returns 200 with Content-Type text/event-stream for authenticated requests", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/events/stream")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
    });

    it("response body contains the 'connected' event with a clientId", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/events/stream")
        .set("Cookie", cookie)
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on("end", () => callback(null, data));
        })
        .expect(200);

      const body = res.body as string;
      expect(body).toContain("event: connected");
      expect(body).toContain('"type":"connected"');
      expect(body).toMatch(/"clientId":"\S+"/);
    });

    it("delegates to EventsService.getEventStream()", async () => {
      mockEventsService.getEventStream.mockReturnValueOnce(
        of<MessageEvent>({
          data: JSON.stringify({
            type: "heartbeat",
            timestamp: Date.now(),
          }),
          type: "heartbeat",
          id: "1",
        }),
      );

      await request(app.getHttpServer())
        .get("/api/events/stream")
        .set("Cookie", cookie)
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on("end", () => callback(null, data));
        })
        .expect(200);

      expect(mockEventsService.getEventStream).toHaveBeenCalledTimes(1);
    });
  });
});

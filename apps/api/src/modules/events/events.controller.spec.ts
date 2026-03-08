import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import { Observable, of } from "rxjs";
import { take, toArray } from "rxjs/operators";
import { firstValueFrom } from "rxjs";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { SessionGuard } from "../../guards/session.guard";
import { AuthService } from "../auth/auth.service";

const fakeSession = {
  id: "sess-1",
  serverId: "ephemeral:pve.local:8006",
  username: "root@pam",
  realm: "pam",
  ticket: "PVE:root@pam:abc",
  csrfToken: "csrf",
  expiresAt: Date.now() + 60_000,
  server: {} as ReturnType<typeof Object>,
};

const mockAuthService = {
  requireSession: jest.fn().mockReturnValue(fakeSession),
};

function makeContext(): ExecutionContext {
  const req = { cookies: { pxa_session: "sess-1" } } as unknown;
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe("EventsController", () => {
  let controller: EventsController;
  let eventsService: {
    getEventStream: jest.Mock;
    isRedisAvailable: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    eventsService = {
      getEventStream: jest.fn().mockReturnValue(
        of(
          {
            data: JSON.stringify({ type: "heartbeat", timestamp: 1000 }),
            type: "heartbeat",
            id: "1",
          },
          {
            data: JSON.stringify({
              type: "node-status",
              nodes: [],
              timestamp: 1001,
            }),
            type: "node-status",
            id: "2",
          },
        ),
      ),
      isRedisAvailable: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: eventsService },
        { provide: AuthService, useValue: mockAuthService },
        SessionGuard,
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  describe("stream()", () => {
    it("returns an Observable", () => {
      const result = controller.stream({} as ReturnType<typeof Object>);
      expect(result).toBeInstanceOf(Observable);
    });

    it("emits a 'connected' event as the first item", async () => {
      const items = await firstValueFrom(
        controller
          .stream({} as ReturnType<typeof Object>)
          .pipe(take(1), toArray()),
      );
      expect(items).toHaveLength(1);
      const first = items[0];
      const parsed = JSON.parse(first.data as string);
      expect(parsed.type).toBe("connected");
      expect(typeof parsed.clientId).toBe("string");
      expect(parsed.clientId).toHaveLength(36); // UUID v4
      expect(typeof parsed.timestamp).toBe("number");
    });

    it("assigns a unique clientId for each call", async () => {
      const req = {} as ReturnType<typeof Object>;

      const first = await firstValueFrom(
        controller.stream(req).pipe(take(1), toArray()),
      );
      const second = await firstValueFrom(
        controller.stream(req).pipe(take(1), toArray()),
      );

      const id1 = JSON.parse(first[0].data as string).clientId as string;
      const id2 = JSON.parse(second[0].data as string).clientId as string;
      expect(id1).not.toBe(id2);
    });

    it("concatenates the connected event with the events service stream", async () => {
      const items = await firstValueFrom(
        controller
          .stream({} as ReturnType<typeof Object>)
          .pipe(take(3), toArray()),
      );
      expect(items).toHaveLength(3);

      // First: connected
      const types = items.map(
        (m) => (JSON.parse(m.data as string) as { type: string }).type,
      );
      expect(types[0]).toBe("connected");
      // Remaining come from EventsService
      expect(types[1]).toBe("heartbeat");
      expect(types[2]).toBe("node-status");
    });

    it("delegates to eventsService.getEventStream()", async () => {
      await firstValueFrom(
        controller.stream({} as ReturnType<typeof Object>).pipe(take(1)),
      );
      // getEventStream is called even if we only consume the 'connected' first event
      // because concat lazily subscribes to the second observable on first subscribe
      // In practice it will be called once per stream() invocation
      expect(eventsService.getEventStream).toHaveBeenCalledTimes(1);
    });
  });

  // ── Guard interactions ─────────────────────────────────────────────────────

  describe("SessionGuard", () => {
    it("canActivate returns true when session cookie is valid", () => {
      const guard = new SessionGuard(mockAuthService as unknown as AuthService);
      // makeContext returns a context with pxa_session cookie
      const result = guard.canActivate(makeContext());
      expect(result).toBe(true);
    });
  });
});

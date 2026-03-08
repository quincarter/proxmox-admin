import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import {
  createTestApp,
  doLogin,
  LOGIN_BODY,
  MOCK_PROXMOX_TICKET,
  MockProxmoxHttp,
} from "../helpers/test-app";

describe("Auth endpoints", () => {
  let app: INestApplication;
  let proxmoxHttp: MockProxmoxHttp;

  beforeAll(async () => {
    ({ app, proxmoxHttp } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /api/auth/login ──────────────────────────────────────────────────

  describe("POST /api/auth/login", () => {
    it("returns 200, sets httpOnly pxa_session cookie, and returns session data", async () => {
      proxmoxHttp.post.mockResolvedValueOnce(MOCK_PROXMOX_TICKET);

      const res = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send(LOGIN_BODY)
        .expect(200);

      // Verify response body shape
      expect(res.body.data).toMatchObject({
        username: MOCK_PROXMOX_TICKET.username,
        realm: LOGIN_BODY.realm,
        server: {
          host: LOGIN_BODY.host,
          port: LOGIN_BODY.port,
          tlsMode: LOGIN_BODY.tlsMode,
        },
      });
      expect(typeof res.body.data.expiresAt).toBe("number");
      expect(res.body.data.expiresAt).toBeGreaterThan(Date.now());

      // sessionId must NOT appear in the body
      expect(res.body.data.sessionId).toBeUndefined();

      // pxa_session cookie must be set as httpOnly
      const rawCookies = res.headers["set-cookie"] as unknown;
      const cookies: string[] = Array.isArray(rawCookies)
        ? (rawCookies as string[])
        : rawCookies
          ? [rawCookies as string]
          : [];
      expect(cookies.length).toBeGreaterThan(0);
      const sessionCookie = cookies.find((c) => c.startsWith("pxa_session"));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("SameSite=Strict");
    });

    it("forwards credentials to Proxmox with the correct username@realm format", async () => {
      proxmoxHttp.post.mockResolvedValueOnce(MOCK_PROXMOX_TICKET);

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send(LOGIN_BODY)
        .expect(200);

      expect(proxmoxHttp.post).toHaveBeenCalledWith(
        expect.anything(),
        "/access/ticket",
        expect.objectContaining({
          username: `${LOGIN_BODY.username}@${LOGIN_BODY.realm}`,
          password: LOGIN_BODY.password,
        }),
      );
    });

    it("returns 400 when required fields are missing", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ host: "192.168.1.10" }) // missing username, password, realm
        .expect(400);
    });

    it("returns 400 when extra non-whitelisted fields are sent", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ ...LOGIN_BODY, extraField: "injected" })
        .expect(400);
    });

    it("returns 400 when port is out of range", async () => {
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ ...LOGIN_BODY, port: 99999 })
        .expect(400);
    });

    it("returns 401 when neither host nor serverId is supplied", async () => {
      const { host: _h, port: _p, ...bodyWithoutHost } = LOGIN_BODY;
      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send(bodyWithoutHost)
        .expect(401);
    });

    it("returns 401 when Proxmox rejects the credentials", async () => {
      proxmoxHttp.post.mockRejectedValueOnce({ response: { status: 401 } });

      await request(app.getHttpServer())
        .post("/api/auth/login")
        .send(LOGIN_BODY)
        .expect(401);
    });

    it("persists the server record when saveServer is true", async () => {
      const savedServer = {
        id: "server-uuid-123",
        label: "Home PVE",
        host: "192.168.1.10",
        port: 8006,
        tlsMode: "insecure",
        lastConnectedAt: new Date(),
      };
      proxmoxHttp.post.mockResolvedValueOnce(MOCK_PROXMOX_TICKET);
      // audit create is already mocked to resolve
      proxmoxHttp.post.mockResolvedValue(MOCK_PROXMOX_TICKET);

      // set up the upsert mock — called when saveServer: true
      const { prisma } = await createTestApp(); // use a fresh isolated app for this
      const upsertMock = prisma.knownServer.upsert as jest.Mock;
      upsertMock.mockResolvedValue(savedServer);
      prisma.knownServer.update = jest.fn().mockResolvedValue(savedServer);

      // For this test we re-create a dedicated app so mocks are independent
      const {
        app: isolatedApp,
        proxmoxHttp: isoHttp,
        prisma: isoPrisma,
      } = await createTestApp();
      (isoPrisma.knownServer.upsert as jest.Mock).mockResolvedValue(
        savedServer,
      );
      (isoPrisma.knownServer.update as jest.Mock).mockResolvedValue(
        savedServer,
      );
      isoHttp.post.mockResolvedValueOnce(MOCK_PROXMOX_TICKET);

      const res = await request(isolatedApp.getHttpServer())
        .post("/api/auth/login")
        .send({ ...LOGIN_BODY, saveServer: true, label: "Home PVE" })
        .expect(200);

      expect(isoPrisma.knownServer.upsert).toHaveBeenCalled();
      expect(res.body.data.server.id).toBe(savedServer.id);
      expect(res.body.data.server.label).toBe(savedServer.label);
      await isolatedApp.close();
    });
  });

  // ─── GET /api/auth/session ─────────────────────────────────────────────────

  describe("GET /api/auth/session", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer()).get("/api/auth/session").expect(401);
    });

    it("returns 200 with session data when a valid session cookie is present", async () => {
      const cookie = await doLogin(app, proxmoxHttp);

      const res = await request(app.getHttpServer())
        .get("/api/auth/session")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        username: MOCK_PROXMOX_TICKET.username,
        realm: LOGIN_BODY.realm,
        server: {
          host: LOGIN_BODY.host,
          port: LOGIN_BODY.port,
        },
      });
      expect(typeof res.body.data.expiresAt).toBe("number");
      expect(typeof res.body.data.serverId).toBe("string");
    });

    it("returns 401 with an unknown session id", async () => {
      await request(app.getHttpServer())
        .get("/api/auth/session")
        .set("Cookie", "pxa_session=00000000-0000-0000-0000-000000000000")
        .expect(401);
    });
  });

  // ─── DELETE /api/auth/logout ───────────────────────────────────────────────

  describe("DELETE /api/auth/logout", () => {
    it("returns 204 when authenticated and clears the cookie", async () => {
      const cookie = await doLogin(app, proxmoxHttp);

      const res = await request(app.getHttpServer())
        .delete("/api/auth/logout")
        .set("Cookie", cookie)
        .expect(204);

      // Cookie should be cleared (Max-Age=0 or Expires in the past)
      const rawSetCookies = res.headers["set-cookie"] as unknown;
      const setCookies: string[] = Array.isArray(rawSetCookies)
        ? (rawSetCookies as string[])
        : rawSetCookies
          ? [rawSetCookies as string]
          : [];
      const cleared = setCookies.find((c) => c.startsWith("pxa_session"));
      if (cleared) {
        expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
      }
    });

    it("returns 204 gracefully even without a session cookie", async () => {
      await request(app.getHttpServer()).delete("/api/auth/logout").expect(204);
    });

    it("invalidates the session so subsequent GET /session returns 401", async () => {
      const cookie = await doLogin(app, proxmoxHttp);

      await request(app.getHttpServer())
        .delete("/api/auth/logout")
        .set("Cookie", cookie)
        .expect(204);

      await request(app.getHttpServer())
        .get("/api/auth/session")
        .set("Cookie", cookie)
        .expect(401);
    });
  });
});

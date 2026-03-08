import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import {
  createTestApp,
  doLogin,
  MockProxmoxHttp,
  MOCK_NODE_SUMMARY,
  MOCK_NODE_VERSION,
  MOCK_NODE_SUBSCRIPTION,
  MOCK_TASK_SUMMARY,
} from "../helpers/test-app";

describe("Nodes endpoints", () => {
  let app: INestApplication;
  let proxmoxHttp: MockProxmoxHttp;
  let cookie: string;

  beforeAll(async () => {
    ({ app, proxmoxHttp } = await createTestApp());
    cookie = await doLogin(app, proxmoxHttp);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Keep post mock set correctly — it was consumed by doLogin
    // get/post calls in tests are set up per-test
    proxmoxHttp.get.mockReset();
    proxmoxHttp.post.mockReset();
  });

  // ─── GET /api/nodes ────────────────────────────────────────────────────────

  describe("GET /api/nodes", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer()).get("/api/nodes").expect(401);
    });

    it("returns 200 with a list of node summaries", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_NODE_SUMMARY]);

      const res = await request(app.getHttpServer())
        .get("/api/nodes")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toMatchObject({
        node: "pve",
        status: "online",
      });

      // Verify the authenticated client was built correctly
      expect(proxmoxHttp.buildClient).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket: "PVE:root@pam:DEADBEEF::TESTTOKEN",
          csrfToken: "TESTCSRF123",
        }),
      );
    });

    it("propagates upstream errors as 500", async () => {
      proxmoxHttp.get.mockRejectedValueOnce(
        Object.assign(new Error("Proxmox unreachable"), {
          response: { status: 503 },
        }),
      );

      await request(app.getHttpServer())
        .get("/api/nodes")
        .set("Cookie", cookie)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(500);
        });
    });
  });

  // ─── GET /api/nodes/:node ──────────────────────────────────────────────────

  describe("GET /api/nodes/:node", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer()).get("/api/nodes/pve").expect(401);
    });

    it("returns 200 with composed node detail (status + version + subscription)", async () => {
      proxmoxHttp.get.mockImplementation((_client: unknown, path: string) => {
        if (path.endsWith("/status")) return Promise.resolve(MOCK_NODE_SUMMARY);
        if (path.endsWith("/version"))
          return Promise.resolve(MOCK_NODE_VERSION);
        if (path.endsWith("/subscription"))
          return Promise.resolve(MOCK_NODE_SUBSCRIPTION);
        return Promise.reject(new Error(`Unexpected path in test: ${path}`));
      });

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        node: "pve",
        version: { release: "8.4" },
        subscription: { status: "Active" },
      });
    });

    it("still returns 200 when subscription endpoint fails (non-critical)", async () => {
      proxmoxHttp.get.mockImplementation((_client: unknown, path: string) => {
        if (path.endsWith("/status")) return Promise.resolve(MOCK_NODE_SUMMARY);
        if (path.endsWith("/version"))
          return Promise.resolve(MOCK_NODE_VERSION);
        if (path.endsWith("/subscription"))
          return Promise.reject(new Error("subscription unavailable"));
        return Promise.reject(new Error(`Unexpected path: ${path}`));
      });

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data.node).toBe("pve");
      // subscription is undefined when it fails — not present or null
      expect(res.body.data.subscription == null).toBe(true);
    });

    it("returns three concurrent requests to Proxmox for a single node detail", async () => {
      proxmoxHttp.get.mockResolvedValue(MOCK_NODE_SUMMARY);

      await request(app.getHttpServer())
        .get("/api/nodes/pve")
        .set("Cookie", cookie)
        .expect(200);

      expect(proxmoxHttp.get).toHaveBeenCalledTimes(3);
      const paths = proxmoxHttp.get.mock.calls.map(
        (call: unknown[]) => call[1],
      );
      expect(paths).toContain("/nodes/pve/status");
      expect(paths).toContain("/nodes/pve/version");
      expect(paths).toContain("/nodes/pve/subscription");
    });
  });

  // ─── GET /api/nodes/:node/tasks ───────────────────────────────────────────

  describe("GET /api/nodes/:node/tasks", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/tasks")
        .expect(401);
    });

    it("returns 200 with a list of task summaries", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_TASK_SUMMARY]);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/tasks")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        upid: MOCK_TASK_SUMMARY.upid,
        node: "pve",
        type: "qmstart",
        status: "OK",
      });
    });

    it("calls Proxmox with limit=50 query parameter", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_TASK_SUMMARY]);

      await request(app.getHttpServer())
        .get("/api/nodes/pve/tasks")
        .set("Cookie", cookie)
        .expect(200);

      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/tasks?limit=50",
      );
    });

    it("returns an empty array when the node has no tasks", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/tasks")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toEqual([]);
    });

    it("propagates upstream errors as 500", async () => {
      proxmoxHttp.get.mockRejectedValueOnce(
        Object.assign(new Error("node unreachable"), {
          response: { status: 503 },
        }),
      );

      await request(app.getHttpServer())
        .get("/api/nodes/pve/tasks")
        .set("Cookie", cookie)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(500);
        });
    });
  });
});

import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import {
  createTestApp,
  doLogin,
  MockProxmoxHttp,
  MOCK_STORAGE_SUMMARY,
  MOCK_STORAGE_VOLUME,
} from "../helpers/test-app";

describe("Storage endpoints", () => {
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
    proxmoxHttp.get.mockReset();
    proxmoxHttp.post.mockReset();
  });

  // ─── GET /api/storage ──────────────────────────────────────────────────────

  describe("GET /api/storage", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer()).get("/api/storage").expect(401);
    });

    it("returns 200 with global storage list", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_STORAGE_SUMMARY]);

      const res = await request(app.getHttpServer())
        .get("/api/storage")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ storage: "local", type: "dir" });
      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/storage",
      );
    });
  });

  // ─── GET /api/nodes/:node/storage ─────────────────────────────────────────

  describe("GET /api/nodes/:node/storage", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/storage")
        .expect(401);
    });

    it("returns 200 with node-scoped storage list", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_STORAGE_SUMMARY]);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/storage")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/storage",
      );
    });
  });

  // ─── GET /api/nodes/:node/storage/:storageId ──────────────────────────────

  describe("GET /api/nodes/:node/storage/:storageId", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/storage/local")
        .expect(401);
    });

    it("returns 200 with storage detail including status and volumes", async () => {
      proxmoxHttp.get.mockImplementation((_client: unknown, path: string) => {
        if (path.endsWith("/status"))
          return Promise.resolve(MOCK_STORAGE_SUMMARY);
        if (path.endsWith("/content"))
          return Promise.resolve([MOCK_STORAGE_VOLUME]);
        return Promise.reject(new Error(`Unexpected path in test: ${path}`));
      });

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/storage/local")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({ storage: "local", node: "pve" });
      expect(res.body.data.volumes).toHaveLength(1);
      expect(res.body.data.volumes[0].volid).toBe(MOCK_STORAGE_VOLUME.volid);
    });

    it("returns 200 with empty volumes when content endpoint fails", async () => {
      proxmoxHttp.get.mockImplementation((_client: unknown, path: string) => {
        if (path.endsWith("/status"))
          return Promise.resolve(MOCK_STORAGE_SUMMARY);
        if (path.endsWith("/content"))
          return Promise.reject(new Error("storage not accessible"));
        return Promise.reject(new Error(`Unexpected path: ${path}`));
      });

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/storage/local")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data.volumes).toEqual([]);
    });

    it("fetches status and content concurrently (2 http.get calls)", async () => {
      proxmoxHttp.get.mockResolvedValue(MOCK_STORAGE_SUMMARY);

      await request(app.getHttpServer())
        .get("/api/nodes/pve/storage/local")
        .set("Cookie", cookie)
        .expect(200);

      expect(proxmoxHttp.get).toHaveBeenCalledTimes(2);
      const paths = proxmoxHttp.get.mock.calls.map(
        (call: unknown[]) => call[1] as string,
      );
      expect(paths.some((p) => p.endsWith("/status"))).toBe(true);
      expect(paths.some((p) => p.endsWith("/content"))).toBe(true);
    });
  });
});

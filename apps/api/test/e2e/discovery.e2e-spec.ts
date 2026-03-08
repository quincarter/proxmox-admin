import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createTestApp, MockPrisma } from "../helpers/test-app";

describe("Discovery endpoints (no auth required)", () => {
  let app: INestApplication;
  let prisma: MockPrisma;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply default mocks after clearAllMocks
    (prisma.discoveryResult.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.discoveryResult.upsert as jest.Mock).mockResolvedValue(undefined);
  });

  // ─── GET /api/discovery/hints ──────────────────────────────────────────────

  describe("GET /api/discovery/hints", () => {
    it("returns 200 with an empty hints list when PROXMOX_HINTS is not set", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/discovery/hints")
        .expect(200);

      expect(res.body).toMatchObject({ data: [] });
    });
  });

  // ─── GET /api/discovery ───────────────────────────────────────────────────

  describe("GET /api/discovery", () => {
    it("returns 200 with saved discovery results", async () => {
      const savedResult = {
        id: "result-uuid-1",
        host: "192.168.1.10",
        port: 8006,
        respondedAt: new Date().toISOString(),
        tlsDetected: true,
        dismissed: false,
      };
      (prisma.discoveryResult.findMany as jest.Mock).mockResolvedValueOnce([
        savedResult,
      ]);

      const res = await request(app.getHttpServer())
        .get("/api/discovery")
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        host: "192.168.1.10",
        port: 8006,
      });
      expect(prisma.discoveryResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { dismissed: false } }),
      );
    });

    it("returns 200 with empty array when no results are saved", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/discovery")
        .expect(200);

      expect(res.body).toMatchObject({ data: [] });
    });
  });

  // ─── POST /api/discovery/scan ──────────────────────────────────────────────

  describe("POST /api/discovery/scan", () => {
    it("returns 201 with empty candidates when no PROXMOX_HINTS are configured", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/discovery/scan")
        .expect(201);

      // With no hints nothing is probed — immediate empty result
      expect(res.body).toMatchObject({ data: [] });
      // No DB writes when there are no responding candidates
      expect(prisma.discoveryResult.upsert).not.toHaveBeenCalled();
    });
  });
});

import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "../helpers/test-app";

describe("Health (GET /api/health)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with status ok and an ISO timestamp", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/health")
      .expect(200);

    expect(res.body).toMatchObject({ status: "ok" });
    expect(typeof res.body.timestamp).toBe("string");
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

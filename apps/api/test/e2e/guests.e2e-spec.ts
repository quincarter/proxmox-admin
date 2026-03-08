import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import {
  createTestApp,
  doLogin,
  MockProxmoxHttp,
  MOCK_LXC_GUEST,
  MOCK_LXC_CONFIG,
  MOCK_QEMU_GUEST,
  MOCK_LXC_CURRENT_STATUS,
  MOCK_QEMU_CONFIG,
  MOCK_QEMU_CURRENT_STATUS,
} from "../helpers/test-app";

describe("Guests endpoints", () => {
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
    proxmoxHttp.put.mockReset();
  });

  // ─── GET /api/guests ───────────────────────────────────────────────────────

  describe("GET /api/guests", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer()).get("/api/guests").expect(401);
    });

    it("returns 200 with unified guest list from cluster resources", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_LXC_GUEST, MOCK_QEMU_GUEST]);

      const res = await request(app.getHttpServer())
        .get("/api/guests")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/cluster/resources?type=vm",
      );
    });
  });

  // ─── GET /api/nodes/:node/lxc ──────────────────────────────────────────────

  describe("GET /api/nodes/:node/lxc", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer()).get("/api/nodes/pve/lxc").expect(401);
    });

    it("returns 200 with LXC guest list for the node", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_LXC_GUEST]);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ vmid: 100, type: "lxc" });
      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/lxc",
      );
    });
  });

  // ─── GET /api/nodes/:node/lxc/:vmid ───────────────────────────────────────

  describe("GET /api/nodes/:node/lxc/:vmid", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/100")
        .expect(401);
    });

    it("returns 200 with the LXC config enriched with vmid and node", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_LXC_CONFIG);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/100")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        vmid: 100,
        node: "pve",
        hostname: "test-container",
      });
      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/lxc/100/config",
      );
    });

    it("returns 400 when vmid is not a number", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/notanumber")
        .set("Cookie", cookie)
        .expect(400);
    });
  });

  // ─── POST /api/nodes/:node/lxc/:vmid/action ───────────────────────────────

  describe("POST /api/nodes/:node/lxc/:vmid/action", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .post("/api/nodes/pve/lxc/100/action")
        .send({ action: "start" })
        .expect(401);
    });

    it("returns 201 with upid when given a valid action", async () => {
      const upid = "UPID:pve:000A1B2C:00D4E5F6:6789ABCD:vzstart:100:root@pam:";
      proxmoxHttp.post.mockResolvedValueOnce(upid);

      const res = await request(app.getHttpServer())
        .post("/api/nodes/pve/lxc/100/action")
        .set("Cookie", cookie)
        .send({ action: "start" })
        .expect(201);

      expect(res.body.data.upid).toBe(upid);
      expect(proxmoxHttp.post).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/lxc/100/status/start",
      );
    });

    it.each([
      "start",
      "stop",
      "shutdown",
      "reboot",
      "suspend",
      "resume",
      "reset",
    ])("accepts valid action '%s'", async (action) => {
      proxmoxHttp.post.mockResolvedValueOnce("UPID:pve:...");

      await request(app.getHttpServer())
        .post("/api/nodes/pve/lxc/100/action")
        .set("Cookie", cookie)
        .send({ action })
        .expect(201);
    });

    it("returns 400 for an invalid action value", async () => {
      await request(app.getHttpServer())
        .post("/api/nodes/pve/lxc/100/action")
        .set("Cookie", cookie)
        .send({ action: "DESTROY" })
        .expect(400);
    });

    it("returns 400 when action body is missing", async () => {
      await request(app.getHttpServer())
        .post("/api/nodes/pve/lxc/100/action")
        .set("Cookie", cookie)
        .send({})
        .expect(400);
    });
  });

  // ─── GET /api/nodes/:node/qemu ─────────────────────────────────────────────

  describe("GET /api/nodes/:node/qemu", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer()).get("/api/nodes/pve/qemu").expect(401);
    });

    it("returns 200 with QEMU VM list for the node", async () => {
      proxmoxHttp.get.mockResolvedValueOnce([MOCK_QEMU_GUEST]);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ vmid: 101, type: "qemu" });
      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/qemu",
      );
    });
  });

  // ─── POST /api/nodes/:node/qemu/:vmid/action ──────────────────────────────

  describe("POST /api/nodes/:node/qemu/:vmid/action", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .post("/api/nodes/pve/qemu/101/action")
        .send({ action: "start" })
        .expect(401);
    });

    it("returns 201 with upid when given a valid QEMU action", async () => {
      const upid = "UPID:pve:000A1B2C:00D4E5F6:6789ABCD:qmstart:101:root@pam:";
      proxmoxHttp.post.mockResolvedValueOnce(upid);

      const res = await request(app.getHttpServer())
        .post("/api/nodes/pve/qemu/101/action")
        .set("Cookie", cookie)
        .send({ action: "stop" })
        .expect(201);

      expect(res.body.data.upid).toBe(upid);
      expect(proxmoxHttp.post).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/qemu/101/status/stop",
      );
    });

    it("returns 400 for an invalid QEMU action", async () => {
      await request(app.getHttpServer())
        .post("/api/nodes/pve/qemu/101/action")
        .set("Cookie", cookie)
        .send({ action: "format" })
        .expect(400);
    });
  });

  // ─── GET /api/nodes/:node/lxc/:vmid/status ───────────────────────────────

  describe("GET /api/nodes/:node/lxc/:vmid/status", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/100/status")
        .expect(401);
    });

    it("returns 200 with status enriched with vmid, node, and type lxc", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_LXC_CURRENT_STATUS);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/100/status")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        vmid: 100,
        node: "pve",
        type: "lxc",
        status: "running",
        cpu: MOCK_LXC_CURRENT_STATUS.cpu,
        mem: MOCK_LXC_CURRENT_STATUS.mem,
        maxmem: MOCK_LXC_CURRENT_STATUS.maxmem,
        uptime: MOCK_LXC_CURRENT_STATUS.uptime,
      });
    });

    it("calls Proxmox at the correct status/current path", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_LXC_CURRENT_STATUS);

      await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/100/status")
        .set("Cookie", cookie)
        .expect(200);

      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/lxc/100/status/current",
      );
    });

    it("returns 400 when vmid is not a number", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/notanumber/status")
        .set("Cookie", cookie)
        .expect(400);
    });

    it("propagates upstream errors as 500", async () => {
      proxmoxHttp.get.mockRejectedValueOnce(
        Object.assign(new Error("container not found"), {
          response: { status: 500 },
        }),
      );

      await request(app.getHttpServer())
        .get("/api/nodes/pve/lxc/100/status")
        .set("Cookie", cookie)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(500);
        });
    });
  });

  // ─── GET /api/nodes/:node/qemu/:vmid ─────────────────────────────────────────

  describe("GET /api/nodes/:node/qemu/:vmid", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101")
        .expect(401);
    });

    it("returns 200 with QEMU config enriched with vmid and node", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_QEMU_CONFIG);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        vmid: 101,
        node: "pve",
        name: MOCK_QEMU_CONFIG.name,
        memory: MOCK_QEMU_CONFIG.memory,
        cores: MOCK_QEMU_CONFIG.cores,
        ostype: MOCK_QEMU_CONFIG.ostype,
      });
    });

    it("calls Proxmox at the correct /config path", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_QEMU_CONFIG);

      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101")
        .set("Cookie", cookie)
        .expect(200);

      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/qemu/101/config",
      );
    });

    it("includes disk keys from the raw Proxmox response", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_QEMU_CONFIG);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data.scsi0).toBe(MOCK_QEMU_CONFIG.scsi0);
    });

    it("returns 400 when vmid is not a number", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/notanumber")
        .set("Cookie", cookie)
        .expect(400);
    });

    it("propagates upstream errors as 500", async () => {
      proxmoxHttp.get.mockRejectedValueOnce(
        Object.assign(new Error("VM not found"), {
          response: { status: 500 },
        }),
      );

      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101")
        .set("Cookie", cookie)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(500);
        });
    });
  });

  // ─── GET /api/nodes/:node/qemu/:vmid/status ───────────────────────────────

  describe("GET /api/nodes/:node/qemu/:vmid/status", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101/status")
        .expect(401);
    });

    it("returns 200 with status enriched with vmid, node, and type qemu", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_QEMU_CURRENT_STATUS);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101/status")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data).toMatchObject({
        vmid: 101,
        node: "pve",
        type: "qemu",
        status: "running",
        cpu: MOCK_QEMU_CURRENT_STATUS.cpu,
        mem: MOCK_QEMU_CURRENT_STATUS.mem,
        maxmem: MOCK_QEMU_CURRENT_STATUS.maxmem,
        uptime: MOCK_QEMU_CURRENT_STATUS.uptime,
      });
    });

    it("includes disk I/O counters from the raw Proxmox response", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_QEMU_CURRENT_STATUS);

      const res = await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101/status")
        .set("Cookie", cookie)
        .expect(200);

      expect(res.body.data.diskread).toBe(MOCK_QEMU_CURRENT_STATUS.diskread);
      expect(res.body.data.diskwrite).toBe(MOCK_QEMU_CURRENT_STATUS.diskwrite);
    });

    it("calls Proxmox at the correct status/current path", async () => {
      proxmoxHttp.get.mockResolvedValueOnce(MOCK_QEMU_CURRENT_STATUS);

      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101/status")
        .set("Cookie", cookie)
        .expect(200);

      expect(proxmoxHttp.get).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/qemu/101/status/current",
      );
    });

    it("returns 400 when vmid is not a number", async () => {
      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/notanumber/status")
        .set("Cookie", cookie)
        .expect(400);
    });

    it("propagates upstream errors as 500", async () => {
      proxmoxHttp.get.mockRejectedValueOnce(
        Object.assign(new Error("VM not found"), {
          response: { status: 500 },
        }),
      );

      await request(app.getHttpServer())
        .get("/api/nodes/pve/qemu/101/status")
        .set("Cookie", cookie)
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(500);
        });
    });
  });

  describe("PUT /api/nodes/:node/qemu/:vmid/config", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/101/config")
        .send({ memory: 4096 })
        .expect(401);
    });

    it("returns 200 with data: null when Proxmox accepts the update", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/101/config")
        .set("Cookie", cookie)
        .send({ memory: 4096, cores: 4 })
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("forwards the correct path and body to the Proxmox client", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/101/config")
        .set("Cookie", cookie)
        .send({ memory: 8192, cores: 8 })
        .expect(200);

      expect(proxmoxHttp.put).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/qemu/101/config",
        expect.objectContaining({ memory: 8192, cores: 8 }),
      );
    });

    it("accepts boolean fields such as onboot and acpi", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/101/config")
        .set("Cookie", cookie)
        .send({ onboot: true, acpi: false })
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("accepts string fields such as name and ostype", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/101/config")
        .set("Cookie", cookie)
        .send({ name: "renamed-vm", ostype: "l26" })
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("accepts an empty body and returns 200", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/101/config")
        .set("Cookie", cookie)
        .send({})
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("returns 400 when vmid is not a number", async () => {
      await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/notanumber/config")
        .set("Cookie", cookie)
        .send({ cores: 2 })
        .expect(400);
    });

    it("propagates upstream errors as 500", async () => {
      proxmoxHttp.put.mockRejectedValueOnce(
        Object.assign(new Error("VM is locked"), {
          response: { status: 500 },
        }),
      );

      await request(app.getHttpServer())
        .put("/api/nodes/pve/qemu/101/config")
        .set("Cookie", cookie)
        .send({ memory: 4096 })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(500);
        });
    });
  });

  // ─── PUT /api/nodes/:node/lxc/:vmid/config ────────────────────────────────

  describe("PUT /api/nodes/:node/lxc/:vmid/config", () => {
    it("returns 401 with no cookie", async () => {
      await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/100/config")
        .send({ memory: 1024 })
        .expect(401);
    });

    it("returns 200 with data: null when Proxmox accepts the update", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/100/config")
        .set("Cookie", cookie)
        .send({ memory: 1024, cores: 2 })
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("forwards the correct path and body to the Proxmox client", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/100/config")
        .set("Cookie", cookie)
        .send({ memory: 2048, cores: 4 })
        .expect(200);

      expect(proxmoxHttp.put).toHaveBeenCalledWith(
        expect.anything(),
        "/nodes/pve/lxc/100/config",
        expect.objectContaining({ memory: 2048, cores: 4 }),
      );
    });

    it("accepts boolean fields such as onboot and protection", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/100/config")
        .set("Cookie", cookie)
        .send({ onboot: true, protection: false })
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("accepts string fields such as hostname and ostype", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/100/config")
        .set("Cookie", cookie)
        .send({ hostname: "renamed-ct", ostype: "ubuntu" })
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("accepts an empty body and returns 200", async () => {
      proxmoxHttp.put.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/100/config")
        .set("Cookie", cookie)
        .send({})
        .expect(200);

      expect(res.body.data).toBeNull();
    });

    it("returns 400 when vmid is not a number", async () => {
      await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/notanumber/config")
        .set("Cookie", cookie)
        .send({ cores: 2 })
        .expect(400);
    });

    it("propagates upstream errors as 500", async () => {
      proxmoxHttp.put.mockRejectedValueOnce(
        Object.assign(new Error("container is locked"), {
          response: { status: 500 },
        }),
      );

      await request(app.getHttpServer())
        .put("/api/nodes/pve/lxc/100/config")
        .set("Cookie", cookie)
        .send({ memory: 1024 })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(500);
        });
    });
  });
});

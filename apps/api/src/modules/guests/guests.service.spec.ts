import { Test, TestingModule } from "@nestjs/testing";
import { GuestsService } from "./guests.service";
import { ProxmoxHttpService } from "../proxmox/proxmox-http.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import type { LxcGuest, QemuGuest } from "@proxmox-admin/types";

const fakeClient = {};

const mockProxmox = {
  buildAuthenticatedClient: jest.fn().mockReturnValue(fakeClient),
};

const mockHttp = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};

const serverRef = { host: "pve.local", port: 8006, tlsMode: "system" as const };
const session = {
  ticket: "PVE:root@pam:abc",
  csrfToken: "csrf",
  username: "root@pam",
  expire: 0,
};

const fakeLxc: LxcGuest = {
  vmid: 101,
  name: "ct1",
  type: "lxc",
  status: "running",
  node: "pve",
  cpu: 0.05,
  maxcpu: 2,
  mem: 256 * 1024 * 1024,
  maxmem: 512 * 1024 * 1024,
  disk: 0,
  maxdisk: 8 * 1024 * 1024 * 1024,
  netin: 0,
  netout: 0,
  uptime: 3600,
};

const fakeQemu: QemuGuest = {
  vmid: 100,
  name: "vm1",
  type: "qemu",
  status: "running",
  node: "pve",
  cpu: 0.1,
  maxcpu: 4,
  mem: 1024 * 1024 * 1024,
  maxmem: 4 * 1024 * 1024 * 1024,
  disk: 0,
  maxdisk: 32 * 1024 * 1024 * 1024,
  netin: 0,
  netout: 0,
  uptime: 7200,
  diskread: 0,
  diskwrite: 0,
};

describe("GuestsService", () => {
  let service: GuestsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        { provide: ProxmoxHttpService, useValue: mockHttp },
        { provide: ProxmoxService, useValue: mockProxmox },
      ],
    }).compile();
    service = module.get<GuestsService>(GuestsService);
  });

  describe("listGuests", () => {
    it("fetches all guests via cluster resources", async () => {
      mockHttp.get.mockResolvedValue([fakeLxc, fakeQemu]);
      const result = await service.listGuests(serverRef, session);
      expect(result).toHaveLength(2);
      expect(mockHttp.get).toHaveBeenCalledWith(
        fakeClient,
        "/cluster/resources?type=vm",
      );
    });
  });

  describe("listLxc", () => {
    it("fetches LXC containers for a node", async () => {
      mockHttp.get.mockResolvedValue([fakeLxc]);
      const result = await service.listLxc("pve", serverRef, session);
      expect(result).toEqual([fakeLxc]);
      expect(mockHttp.get).toHaveBeenCalledWith(fakeClient, "/nodes/pve/lxc");
    });
  });

  describe("getLxcConfig", () => {
    it("merges vmid and node into the config response", async () => {
      const rawConfig = { hostname: "ct1", memory: 512, cores: 1 };
      mockHttp.get.mockResolvedValue(rawConfig);
      const result = await service.getLxcConfig("pve", 101, serverRef, session);
      expect(result.vmid).toBe(101);
      expect(result.node).toBe("pve");
      expect((result as any).hostname).toBe("ct1");
    });
  });

  describe("listQemu", () => {
    it("fetches QEMU VMs for a node", async () => {
      mockHttp.get.mockResolvedValue([fakeQemu]);
      const result = await service.listQemu("pve", serverRef, session);
      expect(result).toEqual([fakeQemu]);
      expect(mockHttp.get).toHaveBeenCalledWith(fakeClient, "/nodes/pve/qemu");
    });
  });

  describe("performGuestAction", () => {
    it("posts the action to the correct LXC endpoint and returns UPID", async () => {
      mockHttp.post.mockResolvedValue("UPID:pve::start");
      const upid = await service.performGuestAction(
        "pve",
        101,
        "lxc",
        "start",
        serverRef,
        session,
      );
      expect(upid).toBe("UPID:pve::start");
      expect(mockHttp.post).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/lxc/101/status/start",
      );
    });

    it("posts the action to the correct QEMU endpoint", async () => {
      mockHttp.post.mockResolvedValue("UPID:pve::stop");
      await service.performGuestAction(
        "pve",
        100,
        "qemu",
        "stop",
        serverRef,
        session,
      );
      expect(mockHttp.post).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/qemu/100/status/stop",
      );
    });
  });

  describe("getLxcStatus", () => {
    it("appends vmid, node, and type=lxc", async () => {
      mockHttp.get.mockResolvedValue({
        status: "running",
        cpu: 0.1,
        mem: 128,
        uptime: 100,
      });
      const result = await service.getLxcStatus("pve", 101, serverRef, session);
      expect(result.type).toBe("lxc");
      expect(result.vmid).toBe(101);
      expect(result.node).toBe("pve");
    });
  });

  describe("getQemuStatus", () => {
    it("appends vmid, node, and type=qemu", async () => {
      mockHttp.get.mockResolvedValue({
        status: "stopped",
        cpu: 0,
        mem: 0,
        uptime: 0,
      });
      const result = await service.getQemuStatus(
        "pve",
        100,
        serverRef,
        session,
      );
      expect(result.type).toBe("qemu");
      expect(result.vmid).toBe(100);
      expect(result.node).toBe("pve");
    });
  });

  describe("getQemuConfig", () => {
    it("merges vmid and node into the config response", async () => {
      mockHttp.get.mockResolvedValue({ name: "vm1", cores: 4 });
      const result = await service.getQemuConfig(
        "pve",
        100,
        serverRef,
        session,
      );
      expect(result.vmid).toBe(100);
      expect(result.node).toBe("pve");
    });

    it("passes through arbitrary config fields (disks, network)", async () => {
      const raw = {
        name: "vm1",
        memory: 2048,
        scsi0: "local-lvm:vm-100-disk-0,size=32G",
        net0: "virtio=02:9A:1E:E7:A4:69,bridge=vmbr0",
      };
      mockHttp.get.mockResolvedValue(raw);
      const result = await service.getQemuConfig(
        "pve",
        100,
        serverRef,
        session,
      );
      expect((result as any).scsi0).toBe(raw.scsi0);
      expect((result as any).net0).toBe(raw.net0);
    });

    it("calls the correct Proxmox config endpoint", async () => {
      mockHttp.get.mockResolvedValue({ name: "vm1" });
      await service.getQemuConfig("pve", 100, serverRef, session);
      expect(mockHttp.get).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/qemu/100/config",
      );
    });
  });

  describe("updateQemuConfig", () => {
    it("calls put on the Proxmox config endpoint with the update payload", async () => {
      mockHttp.put.mockResolvedValue(null);
      const update = { name: "renamed-vm", cores: 4, onboot: false };
      await service.updateQemuConfig("pve", 100, update, serverRef, session);
      expect(mockHttp.put).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/qemu/100/config",
        update,
      );
    });

    it("sends only the fields provided in the update", async () => {
      mockHttp.put.mockResolvedValue(null);
      const update = { memory: 4096 };
      await service.updateQemuConfig("pve", 100, update, serverRef, session);
      expect(mockHttp.put).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/qemu/100/config",
        { memory: 4096 },
      );
    });

    it("uses the authenticated client built from serverRef and session", async () => {
      mockHttp.put.mockResolvedValue(null);
      await service.updateQemuConfig(
        "pve",
        100,
        { cores: 2 },
        serverRef,
        session,
      );
      expect(mockProxmox.buildAuthenticatedClient).toHaveBeenCalledWith(
        serverRef,
        session,
      );
    });

    it("propagates errors thrown by the Proxmox http client", async () => {
      mockHttp.put.mockRejectedValue(new Error("locked"));
      await expect(
        service.updateQemuConfig("pve", 100, { name: "x" }, serverRef, session),
      ).rejects.toThrow("locked");
    });
  });

  describe("updateLxcConfig", () => {
    it("calls put on the Proxmox lxc config endpoint with the update payload", async () => {
      mockHttp.put.mockResolvedValue(null);
      const update = { hostname: "new-name", memory: 1024, onboot: true };
      await service.updateLxcConfig("pve", 101, update, serverRef, session);
      expect(mockHttp.put).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/lxc/101/config",
        update,
      );
    });

    it("sends only the fields provided in the update", async () => {
      mockHttp.put.mockResolvedValue(null);
      const update = { memory: 2048 };
      await service.updateLxcConfig("pve", 101, update, serverRef, session);
      expect(mockHttp.put).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/lxc/101/config",
        { memory: 2048 },
      );
    });

    it("uses the authenticated client built from serverRef and session", async () => {
      mockHttp.put.mockResolvedValue(null);
      await service.updateLxcConfig(
        "pve",
        101,
        { cores: 2 },
        serverRef,
        session,
      );
      expect(mockProxmox.buildAuthenticatedClient).toHaveBeenCalledWith(
        serverRef,
        session,
      );
    });

    it("propagates errors thrown by the Proxmox http client", async () => {
      mockHttp.put.mockRejectedValue(new Error("locked"));
      await expect(
        service.updateLxcConfig(
          "pve",
          101,
          { hostname: "x" },
          serverRef,
          session,
        ),
      ).rejects.toThrow("locked");
    });
  });

  describe("getLxcSshCommand", () => {
    it("builds a pct enter SSH command", async () => {
      const cmd = await service.getLxcSshCommand("pve", 101, serverRef);
      expect(cmd).toBe("ssh root@pve.local pct enter 101");
    });
  });

  describe("getQemuSshCommand", () => {
    it("builds a qm terminal SSH command", async () => {
      const cmd = await service.getQemuSshCommand("pve", 100, serverRef);
      expect(cmd).toBe("ssh root@pve.local qm terminal 100");
    });
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { NodesService } from "./nodes.service";
import { ProxmoxHttpService } from "../proxmox/proxmox-http.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import type { NodeSummary } from "@proxmox-admin/types";

const fakeClient = {};

const mockProxmox = {
  buildAuthenticatedClient: jest.fn().mockReturnValue(fakeClient),
};

const mockHttp = {
  get: jest.fn(),
};

const serverRef = { host: "pve.local", port: 8006, tlsMode: "system" as const };
const session = {
  ticket: "PVE:root@pam:abc",
  csrfToken: "csrf",
  username: "root@pam",
  expire: 0,
};

const fakeNode: NodeSummary = {
  node: "pve",
  status: "online",
  type: "node",
  id: "node/pve",
  level: "",
  usage: {
    cpu: 0.1,
    maxcpu: 4,
    mem: 1024 * 1024 * 1024,
    maxmem: 8 * 1024 * 1024 * 1024,
    disk: 0,
    maxdisk: 0,
    uptime: 86400,
    loadavg: [0.1, 0.2, 0.3],
  },
};

describe("NodesService", () => {
  let service: NodesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        { provide: ProxmoxHttpService, useValue: mockHttp },
        { provide: ProxmoxService, useValue: mockProxmox },
      ],
    }).compile();
    service = module.get<NodesService>(NodesService);
  });

  describe("listNodes", () => {
    it("returns an array of node summaries", async () => {
      mockHttp.get.mockResolvedValue([fakeNode]);
      const result = await service.listNodes(serverRef, session);
      expect(result).toEqual([fakeNode]);
      expect(mockHttp.get).toHaveBeenCalledWith(fakeClient, "/nodes");
    });
  });

  describe("getNodeDetail", () => {
    it("merges status, version and subscription into a NodeDetail", async () => {
      const fakeVersion = { version: "8.1.0", release: "8", repoid: "abc" };
      const fakeSubscription = {
        status: "active",
        productname: "PVE",
        regdate: "2024-01-01",
        serverid: "srv",
      };
      mockHttp.get
        .mockResolvedValueOnce(fakeNode) // status
        .mockResolvedValueOnce(fakeVersion) // version
        .mockResolvedValueOnce(fakeSubscription); // subscription

      const result = await service.getNodeDetail("pve", serverRef, session);
      expect(result.node).toBe("pve");
      expect(result.version).toEqual(fakeVersion);
      expect(result.subscription).toEqual(fakeSubscription);
    });

    it("sets subscription to undefined if the call fails", async () => {
      const fakeVersion = { version: "8.1.0", release: "8", repoid: "abc" };
      mockHttp.get
        .mockResolvedValueOnce(fakeNode)
        .mockResolvedValueOnce(fakeVersion)
        .mockRejectedValueOnce(new Error("403 Forbidden"));

      const result = await service.getNodeDetail("pve", serverRef, session);
      expect(result.subscription).toBeUndefined();
    });
  });

  describe("getNodeTasks", () => {
    it("fetches tasks with default limit of 50", async () => {
      mockHttp.get.mockResolvedValue([]);
      await service.getNodeTasks("pve", serverRef, session);
      expect(mockHttp.get).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/tasks?limit=50",
      );
    });

    it("respects a custom limit", async () => {
      mockHttp.get.mockResolvedValue([]);
      await service.getNodeTasks("pve", serverRef, session, 10);
      expect(mockHttp.get).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/tasks?limit=10",
      );
    });
  });
});

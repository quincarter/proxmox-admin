import { Test, TestingModule } from "@nestjs/testing";
import { StorageService } from "./storage.service";
import { ProxmoxHttpService } from "../proxmox/proxmox-http.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import type { StorageSummary } from "@proxmox-admin/types";

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

const fakeStorage: StorageSummary = {
  storage: "local",
  type: "dir",
  content: "images,rootdir",
  enabled: true,
  shared: false,
  avail: 50 * 1024 * 1024 * 1024,
  used: 10 * 1024 * 1024 * 1024,
  total: 60 * 1024 * 1024 * 1024,
  usage: 0.17,
};

describe("StorageService", () => {
  let service: StorageService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ProxmoxHttpService, useValue: mockHttp },
        { provide: ProxmoxService, useValue: mockProxmox },
      ],
    }).compile();
    service = module.get<StorageService>(StorageService);
  });

  describe("listStorage", () => {
    it("fetches cluster-wide storage list", async () => {
      mockHttp.get.mockResolvedValue([fakeStorage]);
      const result = await service.listStorage(serverRef, session);
      expect(result).toEqual([fakeStorage]);
      expect(mockHttp.get).toHaveBeenCalledWith(fakeClient, "/storage");
    });
  });

  describe("listNodeStorage", () => {
    it("fetches storage for a specific node", async () => {
      mockHttp.get.mockResolvedValue([fakeStorage]);
      const result = await service.listNodeStorage("pve", serverRef, session);
      expect(result).toEqual([fakeStorage]);
      expect(mockHttp.get).toHaveBeenCalledWith(
        fakeClient,
        "/nodes/pve/storage",
      );
    });
  });

  describe("getStorageDetail", () => {
    it("merges status and volumes with the node name", async () => {
      const fakeVolumes = [
        {
          volid: "local:iso/debian.iso",
          format: "iso",
          size: 1024 * 1024 * 1024,
        },
      ];
      mockHttp.get
        .mockResolvedValueOnce(fakeStorage) // status
        .mockResolvedValueOnce(fakeVolumes); // content

      const result = await service.getStorageDetail(
        "pve",
        "local",
        serverRef,
        session,
      );
      expect(result.storage).toBe("local");
      expect(result.node).toBe("pve");
      expect(result.volumes).toEqual(fakeVolumes);
    });

    it("falls back to empty volumes array when content fetch fails", async () => {
      mockHttp.get
        .mockResolvedValueOnce(fakeStorage)
        .mockRejectedValueOnce(new Error("403 Forbidden"));

      const result = await service.getStorageDetail(
        "pve",
        "local",
        serverRef,
        session,
      );
      expect(result.volumes).toEqual([]);
    });
  });
});

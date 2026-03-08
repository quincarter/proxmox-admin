import { Test, TestingModule } from "@nestjs/testing";
import { ProxmoxHttpService } from "./proxmox-http.service";
import type { AxiosInstance } from "axios";

describe("ProxmoxHttpService", () => {
  let service: ProxmoxHttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProxmoxHttpService],
    }).compile();
    service = module.get<ProxmoxHttpService>(ProxmoxHttpService);
  });

  describe("buildBaseUrl", () => {
    it("builds a correct HTTPS URL", () => {
      expect(service.buildBaseUrl("pve.local", 8006)).toBe(
        "https://pve.local:8006/api2/json",
      );
    });

    it("handles non-standard ports", () => {
      expect(service.buildBaseUrl("192.168.1.10", 9090)).toBe(
        "https://192.168.1.10:9090/api2/json",
      );
    });
  });

  describe("buildClient", () => {
    it("returns an axios instance", () => {
      const client = service.buildClient({
        baseUrl: "https://pve.local:8006/api2/json",
        tlsMode: "system",
      });
      expect(client).toBeDefined();
      expect(typeof client.get).toBe("function");
    });

    it("sets ticket cookie header when ticket is provided", () => {
      const client = service.buildClient({
        baseUrl: "https://pve.local:8006/api2/json",
        tlsMode: "system",
        ticket: "PVE:root@pam:abc",
        csrfToken: "csrf-value",
      });
      const headers = client.defaults.headers as Record<string, unknown>;
      expect(headers["Cookie"]).toBe("PVEAuthCookie=PVE:root@pam:abc");
      expect(headers["CSRFPreventionToken"]).toBe("csrf-value");
    });

    it("sets Authorization header when apiToken is provided", () => {
      const client = service.buildClient({
        baseUrl: "https://pve.local:8006/api2/json",
        tlsMode: "system",
        apiToken: "root@pam!token=secret",
      });
      const headers = client.defaults.headers as Record<string, unknown>;
      expect(headers["Authorization"]).toBe(
        "PVEAPIToken=root@pam!token=secret",
      );
    });
  });

  describe("get", () => {
    it("unwraps the Proxmox data envelope", async () => {
      const fakeClient = {
        get: jest.fn().mockResolvedValue({ data: { data: [{ node: "pve" }] } }),
      } as unknown as AxiosInstance;

      const result = await service.get<{ node: string }[]>(
        fakeClient,
        "/nodes",
      );
      expect(result).toEqual([{ node: "pve" }]);
      expect(fakeClient.get).toHaveBeenCalledWith("/nodes", undefined);
    });
  });

  describe("post", () => {
    it("unwraps the Proxmox data envelope", async () => {
      const fakeClient = {
        post: jest.fn().mockResolvedValue({ data: { data: "UPID:pve:..." } }),
      } as unknown as AxiosInstance;

      const result = await service.post<string>(
        fakeClient,
        "/nodes/pve/lxc/100/status/start",
      );
      expect(result).toBe("UPID:pve:...");
    });
  });

  describe("put", () => {
    it("unwraps the Proxmox data envelope", async () => {
      const fakeClient = {
        put: jest.fn().mockResolvedValue({ data: { data: null } }),
      } as unknown as AxiosInstance;

      const result = await service.put(
        fakeClient,
        "/nodes/pve/lxc/100/config",
        { memory: 2048 },
      );
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("unwraps the Proxmox data envelope", async () => {
      const fakeClient = {
        delete: jest
          .fn()
          .mockResolvedValue({ data: { data: "UPID:pve:...:delete" } }),
      } as unknown as AxiosInstance;

      const result = await service.delete<string>(
        fakeClient,
        "/nodes/pve/lxc/100",
      );
      expect(result).toBe("UPID:pve:...:delete");
    });
  });
});

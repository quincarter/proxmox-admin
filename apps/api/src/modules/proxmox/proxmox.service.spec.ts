import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ProxmoxService } from "./proxmox.service";
import { ProxmoxHttpService } from "./proxmox-http.service";

const fakeClient = { get: jest.fn(), post: jest.fn() };

const mockHttpService = {
  buildBaseUrl: jest.fn().mockReturnValue("https://pve.local:8006/api2/json"),
  buildClient: jest.fn().mockReturnValue(fakeClient),
  post: jest.fn(),
};

describe("ProxmoxService", () => {
  let service: ProxmoxService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProxmoxService,
        { provide: ProxmoxHttpService, useValue: mockHttpService },
      ],
    }).compile();
    service = module.get<ProxmoxService>(ProxmoxService);
  });

  const serverRef = {
    host: "pve.local",
    port: 8006,
    tlsMode: "system" as const,
  };

  describe("authenticate", () => {
    it("returns session credentials on success", async () => {
      mockHttpService.post.mockResolvedValue({
        ticket: "PVE:root@pam:abc",
        CSRFPreventionToken: "csrf",
        username: "root@pam",
        expire: 1234567890,
      });

      const creds = await service.authenticate(
        serverRef,
        "root",
        "secret",
        "pam",
      );
      expect(creds.ticket).toBe("PVE:root@pam:abc");
      expect(creds.csrfToken).toBe("csrf");
      expect(creds.username).toBe("root@pam");
      expect(mockHttpService.post).toHaveBeenCalledWith(
        fakeClient,
        "/access/ticket",
        { username: "root@pam", password: "secret" },
      );
    });

    it("throws UnauthorizedException on 401", async () => {
      mockHttpService.post.mockRejectedValue({ response: { status: 401 } });
      await expect(
        service.authenticate(serverRef, "root", "wrong", "pam"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("re-throws non-401 errors", async () => {
      mockHttpService.post.mockRejectedValue({
        response: { status: 500 },
        message: "Server error",
      });
      await expect(
        service.authenticate(serverRef, "root", "pass", "pam"),
      ).rejects.toMatchObject({
        response: { status: 500 },
      });
    });
  });

  describe("buildAuthenticatedClient", () => {
    it("calls buildClient with correct args", () => {
      const session = {
        ticket: "PVE:root@pam:abc",
        csrfToken: "csrf",
        username: "root@pam",
        expire: 0,
      };
      service.buildAuthenticatedClient(serverRef, session);
      expect(mockHttpService.buildClient).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket: "PVE:root@pam:abc",
          csrfToken: "csrf",
        }),
      );
    });
  });
});

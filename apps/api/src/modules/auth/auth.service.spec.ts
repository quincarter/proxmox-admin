import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProxmoxService } from "../proxmox/proxmox.service";

const mockProxmoxService = {
  authenticate: jest.fn(),
};

const mockPrismaService = {
  knownServer: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  connectionAudit: {
    create: jest.fn(),
  },
};

const fakeCredentials = {
  ticket: "PVE:root@pam:abc123",
  csrfToken: "csrf-token-value",
  username: "root@pam",
  expire: Date.now() / 1000 + 7200,
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProxmoxService, useValue: mockProxmoxService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  describe("login with ephemeral host", () => {
    it("returns a sessionId and user info on success", async () => {
      mockProxmoxService.authenticate.mockResolvedValue(fakeCredentials);
      const result = await service.login(
        {
          host: "pve.local",
          port: 8006,
          username: "root",
          password: "secret",
          realm: "pam",
        },
        "127.0.0.1",
      );
      expect(result.sessionId).toBeDefined();
      expect(result.username).toBe("root@pam");
      expect(result.realm).toBe("pam");
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it("stores the session so it can be retrieved", async () => {
      mockProxmoxService.authenticate.mockResolvedValue(fakeCredentials);
      const { sessionId } = await service.login(
        {
          host: "pve.local",
          port: 8006,
          username: "root",
          password: "secret",
          realm: "pam",
        },
        "127.0.0.1",
      );
      const session = service.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.username).toBe("root@pam");
    });
  });

  describe("login with saved serverId", () => {
    it("throws NotFoundException when serverId does not exist", async () => {
      mockPrismaService.knownServer.findUnique.mockResolvedValue(null);
      await expect(
        service.login(
          {
            serverId: "non-existent",
            username: "root",
            password: "pass",
            realm: "pam",
          },
          "127.0.0.1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("uses the persisted server and writes an audit log", async () => {
      const server = {
        id: "srv-1",
        host: "pve.local",
        port: 8006,
        tlsMode: "system",
        label: "Home PVE",
      };
      mockPrismaService.knownServer.findUnique.mockResolvedValue(server);
      mockPrismaService.connectionAudit.create.mockResolvedValue({});
      mockPrismaService.knownServer.update.mockResolvedValue(server);
      mockProxmoxService.authenticate.mockResolvedValue(fakeCredentials);

      const result = await service.login(
        {
          serverId: "srv-1",
          username: "root",
          password: "secret",
          realm: "pam",
        },
        "10.0.0.1",
      );
      expect(result.sessionId).toBeDefined();
      expect(mockPrismaService.connectionAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ event: "login", success: true }),
        }),
      );
    });
  });

  describe("login validation", () => {
    it("throws UnauthorizedException when neither host nor serverId provided", async () => {
      await expect(
        service.login(
          { username: "root", password: "pass", realm: "pam" } as any,
          "127.0.0.1",
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("removes the session", async () => {
      mockProxmoxService.authenticate.mockResolvedValue(fakeCredentials);
      const { sessionId } = await service.login(
        {
          host: "pve.local",
          port: 8006,
          username: "root",
          password: "secret",
          realm: "pam",
        },
        "127.0.0.1",
      );
      service.logout(sessionId);
      expect(service.getSession(sessionId)).toBeUndefined();
    });

    it("is a no-op for unknown session ids", () => {
      expect(() => service.logout("unknown-id")).not.toThrow();
    });
  });

  describe("getSession", () => {
    it("returns undefined for unknown sessions", () => {
      expect(service.getSession("does-not-exist")).toBeUndefined();
    });

    it("returns undefined and cleans up expired sessions", async () => {
      mockProxmoxService.authenticate.mockResolvedValue(fakeCredentials);
      const { sessionId } = await service.login(
        {
          host: "pve.local",
          port: 8006,
          username: "root",
          password: "secret",
          realm: "pam",
        },
        "127.0.0.1",
      );
      // Manually expire the session by manipulating the Map via the service
      const session = service.getSession(sessionId)!;
      (session as any).expiresAt = Date.now() - 1;
      // Re-store with expired time via a trick: access internal map through getSession
      expect(service.getSession(sessionId)).toBeUndefined();
    });
  });

  describe("requireSession", () => {
    it("throws UnauthorizedException for missing sessions", () => {
      expect(() => service.requireSession("no-such-id")).toThrow(
        UnauthorizedException,
      );
    });

    it("returns the active session when valid", async () => {
      mockProxmoxService.authenticate.mockResolvedValue(fakeCredentials);
      const { sessionId } = await service.login(
        {
          host: "pve.local",
          port: 8006,
          username: "root",
          password: "secret",
          realm: "pam",
        },
        "127.0.0.1",
      );
      const session = service.requireSession(sessionId);
      expect(session.username).toBe("root@pam");
    });
  });
});

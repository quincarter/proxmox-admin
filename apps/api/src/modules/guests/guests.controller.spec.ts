import { Test, TestingModule } from "@nestjs/testing";
import { GuestsController } from "./guests.controller";
import { GuestsService } from "./guests.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { SessionGuard } from "../../guards/session.guard";

describe("GuestsController", () => {
  let controller: GuestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestsController],
      providers: [
        {
          provide: GuestsService,
          useValue: {
            getLxcSshCommand: jest
              .fn()
              .mockResolvedValue("ssh root@host pct enter 101"),
            getQemuSshCommand: jest
              .fn()
              .mockResolvedValue("ssh root@host qm terminal 100"),
            updateQemuConfig: jest.fn().mockResolvedValue(undefined),
            updateLxcConfig: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: { knownServer: { findUniqueOrThrow: jest.fn() } },
        },
        {
          provide: AuthService,
          useValue: {
            requireSession: jest
              .fn()
              .mockReturnValue({ serverId: "ephemeral:pve.local:8006" }),
          },
        },
        SessionGuard,
      ],
    }).compile();
    controller = module.get<GuestsController>(GuestsController);
  });

  it("should return LXC SSH command", async () => {
    const req = {
      session: {
        serverId: "ephemeral:pve.local:8006",
        ticket: "",
        csrfToken: "",
        username: "",
        realm: "",
        expiresAt: 0,
      },
    };
    const result = await controller.getLxcSshCommand("node", 101, req as any);
    expect(result.data.ssh).toBe("ssh root@host pct enter 101");
  });

  it("should return QEMU SSH command", async () => {
    const req = {
      session: {
        serverId: "ephemeral:pve.local:8006",
        ticket: "",
        csrfToken: "",
        username: "",
        realm: "",
        expiresAt: 0,
      },
    };
    const result = await controller.getQemuSshCommand("node", 100, req as any);
    expect(result.data.ssh).toBe("ssh root@host qm terminal 100");
  });

  describe("updateQemuConfig", () => {
    const req = {
      session: {
        serverId: "ephemeral:pve.local:8006",
        ticket: "",
        csrfToken: "",
        username: "",
        realm: "",
        expiresAt: 0,
      },
    };

    it("delegates to GuestsService.updateQemuConfig with node, vmid, and dto", async () => {
      const result = await controller.updateQemuConfig(
        "pve",
        100,
        { memory: 4096, cores: 4 },
        req as any,
      );
      expect(result).toEqual({ data: null });
    });

    it("passes a string name field through", async () => {
      const result = await controller.updateQemuConfig(
        "pve",
        100,
        { name: "renamed" },
        req as any,
      );
      expect(result).toEqual({ data: null });
    });

    it("passes a boolean onboot field through", async () => {
      const result = await controller.updateQemuConfig(
        "pve",
        100,
        { onboot: true },
        req as any,
      );
      expect(result).toEqual({ data: null });
    });
  });

  describe("updateLxcConfig", () => {
    const req = {
      session: {
        serverId: "ephemeral:pve.local:8006",
        ticket: "",
        csrfToken: "",
        username: "",
        realm: "",
        expiresAt: 0,
      },
    };

    it("delegates to GuestsService.updateLxcConfig with node, vmid, and dto", async () => {
      const result = await controller.updateLxcConfig(
        "pve",
        101,
        { memory: 1024, cores: 2 },
        req as any,
      );
      expect(result).toEqual({ data: null });
    });

    it("passes a string hostname field through", async () => {
      const result = await controller.updateLxcConfig(
        "pve",
        101,
        { hostname: "new-ct" },
        req as any,
      );
      expect(result).toEqual({ data: null });
    });

    it("passes a boolean onboot field through", async () => {
      const result = await controller.updateLxcConfig(
        "pve",
        101,
        { onboot: false },
        req as any,
      );
      expect(result).toEqual({ data: null });
    });
  });
});

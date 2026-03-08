import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { DiscoveryService } from "./discovery.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockConfig = {
  get: jest.fn(),
};

const mockPrisma = {
  discoveryResult: {
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
};

describe("DiscoveryService", () => {
  let service: DiscoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);
  });

  describe("getConfiguredHints", () => {
    it("returns an empty array when env var is not set", () => {
      mockConfig.get.mockReturnValue("");
      expect(service.getConfiguredHints()).toEqual([]);
    });

    it("parses a single host:port hint", () => {
      mockConfig.get.mockReturnValue("192.168.1.10:8006");
      expect(service.getConfiguredHints()).toEqual([
        { host: "192.168.1.10", port: 8006 },
      ]);
    });

    it("parses multiple comma-separated hints", () => {
      mockConfig.get.mockReturnValue("192.168.1.10:8006,192.168.1.11:8006");
      const hints = service.getConfiguredHints();
      expect(hints).toHaveLength(2);
      expect(hints[0]).toEqual({ host: "192.168.1.10", port: 8006 });
      expect(hints[1]).toEqual({ host: "192.168.1.11", port: 8006 });
    });

    it("defaults port to 8006 when omitted", () => {
      mockConfig.get.mockReturnValue("192.168.1.10");
      const hints = service.getConfiguredHints();
      expect(hints[0].port).toBe(8006);
    });

    it("trims whitespace around entries", () => {
      mockConfig.get.mockReturnValue(" 192.168.1.10:8006 , 192.168.1.11:8006 ");
      const hints = service.getConfiguredHints();
      expect(hints).toHaveLength(2);
    });
  });

  describe("probeHost", () => {
    it("returns false when the host is unreachable", async () => {
      jest.spyOn(service, "probeHost").mockResolvedValue(false);
      const result = await service.probeHost("192.0.2.1", 8006);
      expect(result).toBe(false);
    });
  });

  describe("discoverHints", () => {
    it("calls probeHost for each hint and returns candidates", async () => {
      mockConfig.get.mockReturnValue("192.0.2.1:8006");
      jest.spyOn(service, "probeHost").mockResolvedValue(false);
      const candidates = await service.discoverHints();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].host).toBe("192.0.2.1");
      expect(candidates[0].responding).toBe(false);
    });

    it("returns empty array when no hints are configured", async () => {
      mockConfig.get.mockReturnValue("");
      const candidates = await service.discoverHints();
      expect(candidates).toEqual([]);
    });
  });

  describe("saveDiscoveryResults", () => {
    it("upserts only responding candidates", async () => {
      mockPrisma.discoveryResult.upsert.mockResolvedValue({});
      await service.saveDiscoveryResults([
        {
          host: "192.168.1.10",
          port: 8006,
          responding: true,
          tlsDetected: true,
        },
        {
          host: "192.168.1.11",
          port: 8006,
          responding: false,
          tlsDetected: false,
        },
      ]);
      expect(mockPrisma.discoveryResult.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.discoveryResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { host_port: { host: "192.168.1.10", port: 8006 } },
        }),
      );
    });

    it("does not call upsert when no candidates respond", async () => {
      await service.saveDiscoveryResults([
        {
          host: "192.168.1.10",
          port: 8006,
          responding: false,
          tlsDetected: false,
        },
      ]);
      expect(mockPrisma.discoveryResult.upsert).not.toHaveBeenCalled();
    });
  });

  describe("listSavedResults", () => {
    it("returns non-dismissed discovery results ordered by respondedAt desc", async () => {
      const fakeResults = [
        {
          host: "192.168.1.10",
          port: 8006,
          respondedAt: new Date(),
          tlsDetected: true,
        },
      ];
      mockPrisma.discoveryResult.findMany.mockResolvedValue(fakeResults);
      const results = await service.listSavedResults();
      expect(results).toEqual(fakeResults);
      expect(mockPrisma.discoveryResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { dismissed: false } }),
      );
    });
  });
});

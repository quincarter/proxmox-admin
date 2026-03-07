import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import axios from "axios";
import * as https from "https";

export interface DiscoveryHint {
  host: string;
  port: number;
}

export interface DiscoveryCandidate {
  host: string;
  port: number;
  responding: boolean;
  tlsDetected: boolean;
  savedAt?: Date;
}

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Returns configured server hints from the environment.
   * Format: PROXMOX_HINTS=192.168.1.10:8006,192.168.1.11:8006
   */
  getConfiguredHints(): DiscoveryHint[] {
    const hintsEnv = this.config.get<string>("PROXMOX_HINTS") ?? "";
    return hintsEnv
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => {
        const [host, portStr] = h.split(":");
        return { host, port: parseInt(portStr ?? "8006", 10) };
      });
  }

  async probeHost(host: string, port: number): Promise<boolean> {
    const agent = new https.Agent({ rejectUnauthorized: false });
    try {
      await axios.get(`https://${host}:${port}/api2/json/version`, {
        httpsAgent: agent,
        timeout: 5_000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async discoverHints(): Promise<DiscoveryCandidate[]> {
    const hints = this.getConfiguredHints();
    return Promise.all(
      hints.map(async (h) => {
        const responding = await this.probeHost(h.host, h.port);
        return { host: h.host, port: h.port, responding, tlsDetected: true };
      }),
    );
  }

  async saveDiscoveryResults(candidates: DiscoveryCandidate[]): Promise<void> {
    for (const c of candidates.filter((x) => x.responding)) {
      await this.prisma.discoveryResult.upsert({
        where: { host_port: { host: c.host, port: c.port } },
        create: {
          host: c.host,
          port: c.port,
          respondedAt: new Date(),
          tlsDetected: c.tlsDetected,
        },
        update: {
          respondedAt: new Date(),
          tlsDetected: c.tlsDetected,
        },
      });
    }
  }

  async listSavedResults() {
    return this.prisma.discoveryResult.findMany({
      where: { dismissed: false },
      orderBy: { respondedAt: "desc" },
    });
  }
}

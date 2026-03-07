import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import type { LoginDto } from "./dto/login.dto";
import type { LoginResponse, ServerConnection } from "@proxmox-admin/types";

/** In-memory session store — replace with Redis or DB-backed sessions for multi-instance */
interface ActiveSession {
  id: string;
  serverId: string;
  username: string;
  realm: string;
  ticket: string;
  csrfToken: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Session map: sessionId → ActiveSession */
  private readonly sessions = new Map<string, ActiveSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly proxmox: ProxmoxService,
  ) {}

  async login(dto: LoginDto, clientIp: string): Promise<LoginResponse> {
    let server: {
      id: string;
      host: string;
      port: number;
      tlsMode: string;
      label: string;
    } | null = null;

    if (dto.serverId) {
      const existing = await this.prisma.knownServer.findUnique({
        where: { id: dto.serverId },
      });
      if (!existing) {
        throw new NotFoundException(`Server ${dto.serverId} not found`);
      }
      server = {
        id: existing.id,
        host: existing.host,
        port: existing.port,
        tlsMode: existing.tlsMode,
        label: existing.label,
      };
    } else if (dto.host) {
      // Upsert the server if saveServer is requested
      if (dto.saveServer) {
        server = await this.prisma.knownServer.upsert({
          where: { host_port: { host: dto.host, port: dto.port ?? 8006 } },
          create: {
            label: dto.label ?? dto.host,
            host: dto.host,
            port: dto.port ?? 8006,
            tlsMode: dto.tlsMode ?? "system",
          },
          update: {
            label: dto.label ?? undefined,
            tlsMode: dto.tlsMode ?? undefined,
            lastConnectedAt: new Date(),
          },
        });
      } else {
        server = {
          id: `ephemeral:${dto.host}:${dto.port ?? 8006}`,
          host: dto.host,
          port: dto.port ?? 8006,
          tlsMode: dto.tlsMode ?? "system",
          label: dto.label ?? dto.host,
        };
      }
    } else {
      throw new UnauthorizedException("Either serverId or host is required");
    }

    // All paths above either assign server or throw — guard for TS control-flow narrowing
    if (!server) {
      throw new UnauthorizedException("Unable to resolve server configuration");
    }

    const serverRef = {
      host: server.host,
      port: server.port,
      tlsMode: server.tlsMode as "system" | "self-signed" | "insecure",
    };

    const credentials = await this.proxmox.authenticate(
      serverRef,
      dto.username,
      dto.password,
      dto.realm,
    );

    const sessionId = uuidv4();
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours

    this.sessions.set(sessionId, {
      id: sessionId,
      serverId: server.id,
      username: credentials.username,
      realm: dto.realm,
      ticket: credentials.ticket,
      csrfToken: credentials.csrfToken,
      expiresAt,
    });

    // Audit log (only for persisted servers)
    if (!server.id.startsWith("ephemeral:")) {
      try {
        await this.prisma.connectionAudit.create({
          data: {
            serverId: server.id,
            event: "login",
            username: credentials.username,
            realm: dto.realm,
            ip: clientIp,
            success: true,
          },
        });
        await this.prisma.knownServer.update({
          where: { id: server.id },
          data: { lastConnectedAt: new Date() },
        });
      } catch (err) {
        this.logger.warn("Failed to write audit log", err);
      }
    }

    const serverConn: ServerConnection = {
      id: server.id,
      label: server.label,
      host: server.host,
      port: server.port,
      tlsMode: server.tlsMode as ServerConnection["tlsMode"],
      lastConnectedAt: Date.now(),
      active: true,
    };

    return {
      sessionId,
      username: credentials.username,
      realm: dto.realm,
      server: serverConn,
      expiresAt,
    };
  }

  logout(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): ActiveSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    return session;
  }

  requireSession(sessionId: string): ActiveSession {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new UnauthorizedException(
        "Session not found or expired. Please log in again.",
      );
    }
    return session;
  }
}

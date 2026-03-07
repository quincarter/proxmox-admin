import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { SessionGuard } from "../../guards/session.guard";
import { StorageService } from "./storage.service";
import { PrismaService } from "../../prisma/prisma.service";

interface AuthenticatedRequest extends Request {
  session: {
    serverId: string;
    ticket: string;
    csrfToken: string;
    username: string;
    realm: string;
    expiresAt: number;
  };
}

@Controller("storage")
@UseGuards(SessionGuard)
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveServerRef(serverId: string) {
    if (serverId.startsWith("ephemeral:")) {
      const [, host, portStr] = serverId.split(":");
      return { host, port: parseInt(portStr, 10), tlsMode: "system" as const };
    }
    const server = await this.prisma.knownServer.findUniqueOrThrow({
      where: { id: serverId },
    });
    return {
      host: server.host,
      port: server.port,
      tlsMode: server.tlsMode as "system" | "self-signed" | "insecure",
    };
  }

  private getSession(req: AuthenticatedRequest) {
    return {
      ticket: req.session.ticket,
      csrfToken: req.session.csrfToken,
      username: req.session.username,
      expire: req.session.expiresAt,
    };
  }

  @Get()
  async listAll(@Req() req: AuthenticatedRequest) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.storage.listStorage(serverRef, this.getSession(req)),
    };
  }
}

@Controller("nodes/:node/storage")
@UseGuards(SessionGuard)
export class NodeStorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveServerRef(serverId: string) {
    if (serverId.startsWith("ephemeral:")) {
      const [, host, portStr] = serverId.split(":");
      return { host, port: parseInt(portStr, 10), tlsMode: "system" as const };
    }
    const server = await this.prisma.knownServer.findUniqueOrThrow({
      where: { id: serverId },
    });
    return {
      host: server.host,
      port: server.port,
      tlsMode: server.tlsMode as "system" | "self-signed" | "insecure",
    };
  }

  private getSession(req: AuthenticatedRequest) {
    return {
      ticket: (req as AuthenticatedRequest).session.ticket,
      csrfToken: (req as AuthenticatedRequest).session.csrfToken,
      username: (req as AuthenticatedRequest).session.username,
      expire: (req as AuthenticatedRequest).session.expiresAt,
    };
  }

  @Get()
  async listNodeStorage(
    @Param("node") node: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.storage.listNodeStorage(
        node,
        serverRef,
        this.getSession(req),
      ),
    };
  }

  @Get(":storageId")
  async getStorageDetail(
    @Param("node") node: string,
    @Param("storageId") storageId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.storage.getStorageDetail(
        node,
        storageId,
        serverRef,
        this.getSession(req),
      ),
    };
  }
}

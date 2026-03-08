import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { SessionGuard } from "../../guards/session.guard";
import { NodesService } from "./nodes.service";
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

@Controller("nodes")
@UseGuards(SessionGuard)
export class NodesController {
  constructor(
    private readonly nodes: NodesService,
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

  @Get()
  async listNodes(@Req() req: AuthenticatedRequest) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    const session = {
      ticket: req.session.ticket,
      csrfToken: req.session.csrfToken,
      username: req.session.username,
      expire: req.session.expiresAt,
    };
    return { data: await this.nodes.listNodes(serverRef, session) };
  }

  @Get(":node")
  async getNode(@Param("node") node: string, @Req() req: AuthenticatedRequest) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    const session = {
      ticket: req.session.ticket,
      csrfToken: req.session.csrfToken,
      username: req.session.username,
      expire: req.session.expiresAt,
    };
    return { data: await this.nodes.getNodeDetail(node, serverRef, session) };
  }

  @Get(":node/tasks")
  async getNodeTasks(
    @Param("node") node: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    const session = {
      ticket: req.session.ticket,
      csrfToken: req.session.csrfToken,
      username: req.session.username,
      expire: req.session.expiresAt,
    };
    return { data: await this.nodes.getNodeTasks(node, serverRef, session) };
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { IsIn } from "class-validator";
import { SessionGuard } from "../../guards/session.guard";
import { GuestsService } from "./guests.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { GuestAction } from "@proxmox-admin/types";

class GuestActionDto {
  @IsIn(["start", "stop", "shutdown", "reboot", "suspend", "resume", "reset"])
  action!: GuestAction;
}

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

@Controller("nodes/:node")
@UseGuards(SessionGuard)
export class GuestsController {
  constructor(
    private readonly guests: GuestsService,
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

  @Get("lxc")
  async listLxc(@Param("node") node: string, @Req() req: AuthenticatedRequest) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.guests.listLxc(node, serverRef, this.getSession(req)),
    };
  }

  @Get("lxc/:vmid")
  async getLxcConfig(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.guests.getLxcConfig(
        node,
        vmid,
        serverRef,
        this.getSession(req),
      ),
    };
  }

  @Post("lxc/:vmid/action")
  async lxcAction(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Body() body: GuestActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    const upid = await this.guests.performGuestAction(
      node,
      vmid,
      "lxc",
      body.action,
      serverRef,
      this.getSession(req),
    );
    return { data: { upid } };
  }

  @Get("lxc/:vmid/status")
  async getLxcStatus(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.guests.getLxcStatus(
        node,
        vmid,
        serverRef,
        this.getSession(req),
      ),
    };
  }

  @Get("qemu/:vmid")
  async getQemuConfig(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.guests.getQemuConfig(
        node,
        vmid,
        serverRef,
        this.getSession(req),
      ),
    };
  }

  @Get("qemu/:vmid/status")
  async getQemuStatus(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.guests.getQemuStatus(
        node,
        vmid,
        serverRef,
        this.getSession(req),
      ),
    };
  }

  @Get("qemu")
  async listQemu(
    @Param("node") node: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    return {
      data: await this.guests.listQemu(node, serverRef, this.getSession(req)),
    };
  }

  @Post("qemu/:vmid/action")
  async qemuAction(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Body() body: GuestActionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    const upid = await this.guests.performGuestAction(
      node,
      vmid,
      "qemu",
      body.action,
      serverRef,
      this.getSession(req),
    );
    return { data: { upid } };
  }
}

@Controller("guests")
@UseGuards(SessionGuard)
export class GuestsListController {
  constructor(
    private readonly guests: GuestsService,
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
  async listAll(@Req() req: AuthenticatedRequest) {
    const session = (req as AuthenticatedRequest).session;
    const serverRef = await this.resolveServerRef(session.serverId);
    const creds = {
      ticket: session.ticket,
      csrfToken: session.csrfToken,
      username: session.username,
      expire: session.expiresAt,
    };
    return { data: await this.guests.listGuests(serverRef, creds) };
  }
}

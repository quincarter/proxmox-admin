import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  ParseIntPipe,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  IsIn,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
} from "class-validator";
import { SessionGuard } from "../../guards/session.guard";
import { GuestsService } from "./guests.service";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  GuestAction,
  QemuConfigUpdate,
  LxcConfigUpdate,
} from "@proxmox-admin/types";

class GuestActionDto {
  @IsIn(["start", "stop", "shutdown", "reboot", "suspend", "resume", "reset"])
  action!: GuestAction;
}

class LxcConfigUpdateDto implements LxcConfigUpdate {
  @IsOptional() @IsString() hostname?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() tags?: string;
  @IsOptional() @IsBoolean() onboot?: boolean;
  @IsOptional() @IsString() startup?: string;
  @IsOptional() @IsString() ostype?: string;
  @IsOptional() @IsString() arch?: string;
  @IsOptional() @IsBoolean() console?: boolean;
  @IsOptional() @IsNumber() tty?: number;
  @IsOptional() @IsString() cmode?: string;
  @IsOptional() @IsBoolean() protection?: boolean;
  @IsOptional() @IsString() features?: string;
  @IsOptional() @IsNumber() memory?: number;
  @IsOptional() @IsNumber() swap?: number;
  @IsOptional() @IsNumber() cores?: number;
  @IsOptional() @IsNumber() cpulimit?: number;
  @IsOptional() @IsNumber() cpuunits?: number;
}

class QemuConfigUpdateDto implements QemuConfigUpdate {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() tags?: string;
  @IsOptional() @IsBoolean() onboot?: boolean;
  @IsOptional() @IsString() startup?: string;
  @IsOptional() @IsString() ostype?: string;
  @IsOptional() @IsString() boot?: string;
  @IsOptional() @IsBoolean() tablet?: boolean;
  @IsOptional() @IsString() hotplug?: string;
  @IsOptional() @IsBoolean() acpi?: boolean;
  @IsOptional() @IsBoolean() kvm?: boolean;
  @IsOptional() @IsBoolean() freeze?: boolean;
  @IsOptional() @IsBoolean() localtime?: boolean;
  @IsOptional() @IsString() rtcbase?: string;
  @IsOptional() @IsString() smbios1?: string;
  @IsOptional() @IsString() agent?: string;
  @IsOptional() @IsBoolean() protection?: boolean;
  @IsOptional() @IsString() spice_enhancements?: string;
  @IsOptional() @IsString() vmstatestorage?: string;
  @IsOptional() @IsNumber() memory?: number;
  @IsOptional() @IsNumber() balloon?: number;
  @IsOptional() @IsNumber() cores?: number;
  @IsOptional() @IsNumber() sockets?: number;
  @IsOptional() @IsNumber() vcpus?: number;
  @IsOptional() @IsString() cpu?: string;
  @IsOptional() @IsBoolean() numa?: boolean;
  @IsOptional() @IsString() bios?: string;
  @IsOptional() @IsString() machine?: string;
  @IsOptional() @IsString() vga?: string;
  @IsOptional() @IsString() scsihw?: string;
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

  @Put("qemu/:vmid/config")
  async updateQemuConfig(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Body() body: QemuConfigUpdateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    await this.guests.updateQemuConfig(
      node,
      vmid,
      body,
      serverRef,
      this.getSession(req),
    );
    return { data: null };
  }

  @Put("lxc/:vmid/config")
  async updateLxcConfig(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Body() body: LxcConfigUpdateDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    await this.guests.updateLxcConfig(
      node,
      vmid,
      body,
      serverRef,
      this.getSession(req),
    );
    return { data: null };
  }

  @Get("lxc/:vmid/ssh")
  async getLxcSshCommand(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    const ssh = await this.guests.getLxcSshCommand(node, vmid, serverRef);
    return { data: { ssh } };
  }

  @Get("qemu/:vmid/ssh")
  async getQemuSshCommand(
    @Param("node") node: string,
    @Param("vmid", ParseIntPipe) vmid: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const serverRef = await this.resolveServerRef(req.session.serverId);
    const ssh = await this.guests.getQemuSshCommand(node, vmid, serverRef);
    return { data: { ssh } };
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

import { Injectable } from "@nestjs/common";
import { ProxmoxHttpService } from "../proxmox/proxmox-http.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import type {
  AnyGuest,
  LxcGuest,
  QemuGuest,
  LxcConfig,
  LxcConfigUpdate,
  QemuConfig,
  QemuConfigUpdate,
  GuestCurrentStatus,
  GuestAction,
} from "@proxmox-admin/types";

type ServerRef = Parameters<ProxmoxService["buildAuthenticatedClient"]>[0];
type SessionCreds = Parameters<ProxmoxService["buildAuthenticatedClient"]>[1];

@Injectable()
export class GuestsService {
  constructor(
    private readonly http: ProxmoxHttpService,
    private readonly proxmox: ProxmoxService,
  ) {}

  async listGuests(
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<AnyGuest[]> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    // Cluster resources gives us a unified list of all VMs and containers
    const resources = await this.http.get<AnyGuest[]>(
      client,
      "/cluster/resources?type=vm",
    );
    return resources;
  }

  async listLxc(
    node: string,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<LxcGuest[]> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    return this.http.get<LxcGuest[]>(client, `/nodes/${node}/lxc`);
  }

  async getLxcConfig(
    node: string,
    vmid: number,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<LxcConfig> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    const config = await this.http.get<Omit<LxcConfig, "vmid" | "node">>(
      client,
      `/nodes/${node}/lxc/${vmid}/config`,
    );
    return { ...config, vmid, node };
  }

  async listQemu(
    node: string,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<QemuGuest[]> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    return this.http.get<QemuGuest[]>(client, `/nodes/${node}/qemu`);
  }

  async performGuestAction(
    node: string,
    vmid: number,
    guestType: "lxc" | "qemu",
    action: GuestAction,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<string> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    const typeSegment = guestType === "lxc" ? "lxc" : "qemu";
    // Returns UPID task string
    return this.http.post<string>(
      client,
      `/nodes/${node}/${typeSegment}/${vmid}/status/${action}`,
    );
  }

  async getLxcStatus(
    node: string,
    vmid: number,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<GuestCurrentStatus> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    const status = await this.http.get<
      Omit<GuestCurrentStatus, "vmid" | "node" | "type">
    >(client, `/nodes/${node}/lxc/${vmid}/status/current`);
    return { ...status, vmid, node, type: "lxc" };
  }

  async getQemuConfig(
    node: string,
    vmid: number,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<QemuConfig> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    const config = await this.http.get<Omit<QemuConfig, "vmid" | "node">>(
      client,
      `/nodes/${node}/qemu/${vmid}/config`,
    );
    return { ...config, vmid, node } as QemuConfig;
  }

  async getQemuStatus(
    node: string,
    vmid: number,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<GuestCurrentStatus> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    const status = await this.http.get<
      Omit<GuestCurrentStatus, "vmid" | "node" | "type">
    >(client, `/nodes/${node}/qemu/${vmid}/status/current`);
    return { ...status, vmid, node, type: "qemu" };
  }

  async updateQemuConfig(
    node: string,
    vmid: number,
    update: QemuConfigUpdate,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<void> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    await this.http.put<null>(
      client,
      `/nodes/${node}/qemu/${vmid}/config`,
      update,
    );
  }

  async updateLxcConfig(
    node: string,
    vmid: number,
    update: LxcConfigUpdate,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<void> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    await this.http.put<null>(
      client,
      `/nodes/${node}/lxc/${vmid}/config`,
      update,
    );
  }

  async getLxcSshCommand(
    _node: string,
    vmid: number,
    serverRef: ServerRef,
  ): Promise<string> {
    const host = serverRef.host;
    return `ssh root@${host} pct enter ${vmid}`;
  }

  async getQemuSshCommand(
    _node: string,
    vmid: number,
    serverRef: ServerRef,
  ): Promise<string> {
    const host = serverRef.host;
    return `ssh root@${host} qm terminal ${vmid}`;
  }
}

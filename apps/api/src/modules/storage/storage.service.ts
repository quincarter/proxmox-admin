import { Injectable } from "@nestjs/common";
import { ProxmoxHttpService } from "../proxmox/proxmox-http.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import type {
  StorageSummary,
  StorageDetail,
  StorageVolume,
} from "@proxmox-admin/types";

type ServerRef = Parameters<ProxmoxService["buildAuthenticatedClient"]>[0];
type SessionCreds = Parameters<ProxmoxService["buildAuthenticatedClient"]>[1];

@Injectable()
export class StorageService {
  constructor(
    private readonly http: ProxmoxHttpService,
    private readonly proxmox: ProxmoxService,
  ) {}

  async listStorage(
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<StorageSummary[]> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    return this.http.get<StorageSummary[]>(client, "/storage");
  }

  async listNodeStorage(
    node: string,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<StorageSummary[]> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    return this.http.get<StorageSummary[]>(client, `/nodes/${node}/storage`);
  }

  async getStorageDetail(
    node: string,
    storageId: string,
    serverRef: ServerRef,
    session: SessionCreds,
  ): Promise<StorageDetail> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    const [status, volumes] = await Promise.all([
      this.http.get<StorageSummary>(
        client,
        `/nodes/${node}/storage/${storageId}/status`,
      ),
      this.http
        .get<
          StorageVolume[]
        >(client, `/nodes/${node}/storage/${storageId}/content`)
        .catch(() => [] as StorageVolume[]),
    ]);
    return { ...status, node, volumes };
  }
}

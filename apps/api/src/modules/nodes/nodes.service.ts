import { Injectable } from "@nestjs/common";
import { ProxmoxHttpService } from "../proxmox/proxmox-http.service";
import { ProxmoxService } from "../proxmox/proxmox.service";
import type { NodeSummary, NodeDetail } from "@proxmox-admin/types";

@Injectable()
export class NodesService {
  constructor(
    private readonly http: ProxmoxHttpService,
    private readonly proxmox: ProxmoxService,
  ) {}

  async listNodes(
    serverRef: Parameters<ProxmoxService["buildAuthenticatedClient"]>[0],
    session: Parameters<ProxmoxService["buildAuthenticatedClient"]>[1],
  ): Promise<NodeSummary[]> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    return this.http.get<NodeSummary[]>(client, "/nodes");
  }

  async getNodeDetail(
    nodeName: string,
    serverRef: Parameters<ProxmoxService["buildAuthenticatedClient"]>[0],
    session: Parameters<ProxmoxService["buildAuthenticatedClient"]>[1],
  ): Promise<NodeDetail> {
    const client = this.proxmox.buildAuthenticatedClient(serverRef, session);
    const [status, version, subscription] = await Promise.all([
      this.http.get<NodeSummary>(client, `/nodes/${nodeName}/status`),
      this.http.get<NodeDetail["version"]>(
        client,
        `/nodes/${nodeName}/version`,
      ),
      this.http
        .get<
          NodeDetail["subscription"]
        >(client, `/nodes/${nodeName}/subscription`)
        .catch(() => undefined),
    ]);
    return {
      ...status,
      node: nodeName,
      type: "node",
      id: `node/${nodeName}`,
      version,
      subscription,
    };
  }
}

// Proxmox VE cluster domain types

export type ClusterStatus = "quorate" | "no quorum" | "single node";

/** Cluster summary from /cluster/status */
export interface ClusterInfo {
  name: string;
  id: string;
  version: number;
  nodes: number;
  quorate: boolean;
  status: ClusterStatus;
}

/** Cluster resource entry (used by /cluster/resources) */
export type ClusterResourceType =
  | "node"
  | "vm"
  | "lxc"
  | "storage"
  | "pool"
  | "sdn";

export interface ClusterResource {
  id: string;
  type: ClusterResourceType;
  node?: string;
  pool?: string;
  status?: string;
  name?: string;
  vmid?: number;
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  uptime?: number;
  hastate?: string;
  tags?: string;
}

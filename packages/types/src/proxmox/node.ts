// Proxmox VE node domain types

/** Node status values as reported by Proxmox */
export type NodeStatus = "online" | "offline" | "unknown";

/** CPU and memory usage from the node status endpoint */
export interface NodeUsage {
  cpu: number; // fraction 0–1
  maxcpu: number; // number of logical CPUs
  mem: number; // bytes used
  maxmem: number; // bytes total
  disk: number; // root disk bytes used
  maxdisk: number; // root disk bytes total
  uptime: number; // seconds
  loadavg: [number, number, number];
}

/** Condensed node summary for list views */
export interface NodeSummary {
  node: string;
  status: NodeStatus;
  ip?: string;
  level?: string; // Proxmox support level: 'c' | 'b' | 'a' | 'premium' | ''
  id: string; // e.g. "node/pve"
  type: "node";
  usage: NodeUsage;
}

/** Full node detail including subscription, storage, and version info */
export interface NodeDetail extends NodeSummary {
  version: ProxmoxVersionInfo;
  subscription?: NodeSubscription;
  timezone?: string;
}

export interface ProxmoxVersionInfo {
  version: string;
  release: string;
  repoid: string;
}

export type SubscriptionStatus = "active" | "inactive" | "notfound" | "invalid";

export interface NodeSubscription {
  status: SubscriptionStatus;
  productname?: string;
  regdate?: string;
  nextduedate?: string;
  url?: string;
}

// Proxmox VE storage domain types

/** Storage backend content types */
export type StorageContentType =
  | "images" // disk images
  | "iso" // ISO images
  | "vztmpl" // LXC templates
  | "backup" // vzdump backups
  | "snippets" // YAML/JSON snippets
  | "rootdir"; // container root directories

/** Storage backend plugin types */
export type StorageType =
  | "dir" // directory-based
  | "lvm" // LVM volume group
  | "lvmthin" // LVM thin provisioned
  | "zfspool" // ZFS pool
  | "btrfs" // BTRFS subvolumes
  | "nfs" // NFS share
  | "cifs" // CIFS/SMB share
  | "rbd" // Ceph RBD
  | "cephfs" // CephFS
  | "pbs" // Proxmox Backup Server
  | string;

/** Storage status as seen from the cluster */
export type StorageStatus = "active" | "inactive" | "disabled";

/** Storage summary from /nodes/{node}/storage or /storage */
export interface StorageSummary {
  storage: string;
  type: StorageType;
  content: string; // comma-separated content types
  status?: StorageStatus;
  enabled?: boolean;
  shared?: boolean;
  total?: number; // bytes total
  used?: number; // bytes used
  avail?: number; // bytes available
  /** Usage fraction 0–1 */
  usage?: number;
  nodes?: string; // which nodes can use this storage
}

/** Full storage detail for the detail page */
export interface StorageDetail extends StorageSummary {
  node: string;
  /** Volume list summary */
  volumes?: StorageVolume[];
}

/** A single storage volume entry */
export interface StorageVolume {
  volid: string; // e.g. local-lvm:vm-100-disk-0
  content: StorageContentType;
  size: number; // bytes
  used?: number;
  format?: string;
  vmid?: number;
  notes?: string;
  ctime?: number;
}

/** LVM thin pool summary */
export interface LvmThinPool {
  name: string;
  dataPercent: number;
  metaPercent: number;
  poolSize: number; // bytes
  freeSize: number; // bytes
}

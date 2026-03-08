// Proxmox VE guest (VM and LXC container) domain types

/** Guest type discriminator */
export type GuestType = "qemu" | "lxc";

/** Unified guest status */
export type GuestStatus =
  | "running"
  | "stopped"
  | "paused"
  | "suspended"
  | "unknown";

/** Shared base for QEMU VMs and LXC containers */
export interface GuestBase {
  vmid: number;
  name: string;
  node: string;
  type: GuestType;
  status: GuestStatus;
  uptime: number; // seconds
  cpu: number; // fraction 0–1
  maxcpu: number;
  mem: number; // bytes used
  maxmem: number; // bytes total
  disk: number; // bytes used
  maxdisk: number; // bytes total
  netin: number; // bytes/s
  netout: number; // bytes/s
  tags?: string; // semicolon-separated Proxmox tags
  lock?: string;
  hastate?: string;
  pid?: number;
}

/** QEMU VM guest */
export interface QemuGuest extends GuestBase {
  type: "qemu";
  template?: boolean;
  agent?: number; // 1 if QEMU agent is running
  diskread: number;
  diskwrite: number;
}

/** LXC container guest */
export interface LxcGuest extends GuestBase {
  type: "lxc";
  /** Unprivileged container flag */
  unprivileged?: boolean;
}

export type AnyGuest = QemuGuest | LxcGuest;

/** LXC container config detail */
export interface LxcConfig {
  vmid: number;
  node: string;
  hostname: string;
  ostype?: string;
  arch?: string;
  unprivileged: boolean;
  memory: number; // MB
  swap: number; // MB
  cores?: number;
  cpulimit?: number;
  rootfs: string; // e.g. "local-lvm:vm-100-disk-0,size=8G"
  /** Network interface configs: net0, net1, ... */
  [netKey: `net${number}`]: string | undefined;
  description?: string;
  tags?: string;
  onboot?: boolean;
  startup?: string;
  protection?: boolean;
  lock?: string;
  // Console / TTY options
  console?: boolean; // /dev/console device
  tty?: number; // number of TTYs (default 2)
  cmode?: string; // console mode: "tty" | "console" | "shell"
  // Feature flags
  features?: string; // e.g. "nesting=1,keyctl=1"
  // CPU weight
  cpuunits?: number;
}

/** Partial update payload for PUT /nodes/{node}/lxc/{vmid}/config */
export interface LxcConfigUpdate {
  // Identity / general
  hostname?: string;
  description?: string;
  tags?: string;
  // Boot / startup
  onboot?: boolean;
  startup?: string;
  // OS / architecture
  ostype?: string;
  arch?: string;
  // Console
  console?: boolean;
  tty?: number;
  cmode?: string;
  // Behaviour
  protection?: boolean;
  features?: string;
  // Resources
  memory?: number;
  swap?: number;
  cores?: number;
  cpulimit?: number;
  cpuunits?: number;
}

/** Action types that can be sent to a guest */
export type GuestAction =
  | "start"
  | "stop"
  | "shutdown"
  | "reboot"
  | "suspend"
  | "resume"
  | "reset";

/**
 * Current runtime status returned by /nodes/{node}/lxc/{vmid}/status/current
 * or /nodes/{node}/qemu/{vmid}/status/current
 */
export interface GuestCurrentStatus {
  vmid: number;
  node: string;
  type: GuestType;
  status: GuestStatus;
  name?: string;
  cpu: number; // fraction 0–1
  cpus: number; // number of vCPUs
  mem: number; // bytes used
  maxmem: number; // bytes allocated
  disk: number; // rootfs bytes used
  maxdisk: number; // rootfs bytes total
  netin: number; // bytes received total
  netout: number; // bytes transmitted total
  diskread?: number;
  diskwrite?: number;
  uptime: number; // seconds
  pid?: number;
  lock?: string;
  hastate?: string;
}

/** QEMU VM configuration from /nodes/{node}/qemu/{vmid}/config */
export interface QemuConfig {
  vmid: number;
  node: string;
  name?: string;
  description?: string;
  memory: number; // MB
  balloon?: number; // minimum balloon memory (MB)
  cores?: number;
  sockets?: number;
  vcpus?: number;
  cpu?: string; // cpu type string e.g. "x86-64-v2-AES"
  numa?: number;
  bios?: string; // seabios | ovmf
  machine?: string;
  ostype?: string;
  boot?: string; // boot order string
  onboot?: boolean;
  startup?: string;
  protection?: boolean;
  lock?: string;
  tags?: string;
  agent?: string;
  // Options tab explicit fields
  tablet?: boolean; // use tablet for pointer
  hotplug?: string; // hotplug features e.g. "disk,network,usb"
  acpi?: boolean; // ACPI support
  kvm?: boolean; // KVM hardware virtualization
  freeze?: boolean; // freeze CPU at startup
  localtime?: boolean; // use local time for RTC
  rtcbase?: string; // RTC start date ("now" or RFC3339)
  smbios1?: string; // SMBIOS type 1 settings
  spice_enhancements?: string; // spice enhancement settings
  vmstatestorage?: string; // VM state storage target
  amd_sev?: string; // AMD SEV config string
  // Hardware tab explicit fields
  vga?: string; // display/VGA type
  scsihw?: string; // SCSI controller type
  /** Disk keys: scsi0, virtio0, ide0, ide2, sata0, efidisk0, ... */
  /** Network keys: net0, net1, ... */
  /** USB keys: usb0, usb1, ... */
  [key: string]: string | number | boolean | undefined;
}

/** Partial update payload for PUT /nodes/{node}/qemu/{vmid}/config */
export interface QemuConfigUpdate {
  // Identification / general
  name?: string;
  description?: string;
  tags?: string;
  // Boot / startup
  onboot?: boolean;
  startup?: string;
  ostype?: string;
  boot?: string;
  // Options / behaviour
  tablet?: boolean;
  hotplug?: string;
  acpi?: boolean;
  kvm?: boolean;
  freeze?: boolean;
  localtime?: boolean;
  rtcbase?: string;
  smbios1?: string;
  agent?: string;
  protection?: boolean;
  spice_enhancements?: string;
  vmstatestorage?: string;
  // Hardware resources
  memory?: number;
  balloon?: number;
  cores?: number;
  sockets?: number;
  vcpus?: number;
  cpu?: string;
  numa?: boolean;
  bios?: string;
  machine?: string;
  vga?: string;
  scsihw?: string;
}

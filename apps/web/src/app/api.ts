import type { BffError, LoginRequest } from "@proxmox-admin/types";

const BASE = "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    ...init,
  });

  if (!res.ok) {
    let err: BffError;
    try {
      err = (await res.json()) as BffError;
    } catch {
      err = { statusCode: res.status, message: res.statusText };
    }
    throw new ApiError(err.statusCode, err.message);
  }

  const json = (await res.json()) as { data: T };
  return json.data;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (body: LoginRequest) =>
    request<{
      username: string;
      realm: string;
      server: import("@proxmox-admin/types").ServerConnection;
      expiresAt: number;
    }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  logout: () => request<void>("/auth/logout", { method: "DELETE" }),

  getSession: () =>
    request<{
      username: string;
      realm: string;
      serverId: string;
      server: import("@proxmox-admin/types").ServerConnection;
      expiresAt: number;
    }>("/auth/session"),
};

// ── Nodes ─────────────────────────────────────────────────────────────────────

export const nodesApi = {
  list: () => request<import("@proxmox-admin/types").NodeSummary[]>("/nodes"),
  get: (node: string) =>
    request<import("@proxmox-admin/types").NodeDetail>(`/nodes/${node}`),
  getTasks: (node: string) =>
    request<import("@proxmox-admin/types").TaskSummary[]>(
      `/nodes/${node}/tasks`,
    ),
};

// ── Guests ────────────────────────────────────────────────────────────────────

export const guestsApi = {
  listAll: () => request<import("@proxmox-admin/types").AnyGuest[]>("/guests"),
  listLxc: (node: string) =>
    request<import("@proxmox-admin/types").LxcGuest[]>(`/nodes/${node}/lxc`),
  getLxcConfig: (node: string, vmid: number) =>
    request<import("@proxmox-admin/types").LxcConfig>(
      `/nodes/${node}/lxc/${vmid}`,
    ),
  getLxcStatus: (node: string, vmid: number) =>
    request<import("@proxmox-admin/types").GuestCurrentStatus>(
      `/nodes/${node}/lxc/${vmid}/status`,
    ),
  lxcAction: (
    node: string,
    vmid: number,
    action: import("@proxmox-admin/types").GuestAction,
  ) =>
    request<{ upid: string }>(`/nodes/${node}/lxc/${vmid}/action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
  listQemu: (node: string) =>
    request<import("@proxmox-admin/types").QemuGuest[]>(`/nodes/${node}/qemu`),
  getQemuConfig: (node: string, vmid: number) =>
    request<import("@proxmox-admin/types").QemuConfig>(
      `/nodes/${node}/qemu/${vmid}`,
    ),
  getQemuStatus: (node: string, vmid: number) =>
    request<import("@proxmox-admin/types").GuestCurrentStatus>(
      `/nodes/${node}/qemu/${vmid}/status`,
    ),
  qemuAction: (
    node: string,
    vmid: number,
    action: import("@proxmox-admin/types").GuestAction,
  ) =>
    request<{ upid: string }>(`/nodes/${node}/qemu/${vmid}/action`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
};

// ── Storage ───────────────────────────────────────────────────────────────────

export const storageApi = {
  listAll: () =>
    request<import("@proxmox-admin/types").StorageSummary[]>("/storage"),
  listNode: (node: string) =>
    request<import("@proxmox-admin/types").StorageSummary[]>(
      `/nodes/${node}/storage`,
    ),
  getDetail: (node: string, storageId: string) =>
    request<import("@proxmox-admin/types").StorageDetail>(
      `/nodes/${node}/storage/${storageId}`,
    ),
};

// ── Discovery ─────────────────────────────────────────────────────────────────

export const discoveryApi = {
  getHints: () =>
    request<Array<{ host: string; port: number }>>("/discovery/hints"),
  list: () => request("/discovery"),
  scan: () => request("/discovery/scan", { method: "POST" }),
};

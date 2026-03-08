// Worker environment configuration — loaded from process.env at startup.

export interface WorkerConfig {
  /** Proxmox host (e.g. 192.168.1.10) */
  proxmoxHost: string;
  /** Proxmox API port — defaults to 8006 */
  proxmoxPort: number;
  /** Username without realm (e.g. root) */
  proxmoxUser: string;
  /** Plaintext password — keep in Docker secret / env */
  proxmoxPass: string;
  /** Proxmox realm — defaults to pam */
  proxmoxRealm: string;
  /** Reject self-signed TLS certs — set false for homelab */
  tlsRejectUnauthorized: boolean;
  /** Redis connection URL */
  redisUrl: string;
  /** Polling interval in milliseconds — defaults to 15 000 */
  pollIntervalMs: number;
  /** Log level */
  logLevel: "debug" | "info" | "warn" | "error";
}

export function loadConfig(): WorkerConfig {
  const required = (key: string): string => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing required env var: ${key}`);
    return val;
  };

  return {
    proxmoxHost: required("PROXMOX_HOST"),
    proxmoxPort: parseInt(process.env["PROXMOX_PORT"] ?? "8006", 10),
    proxmoxUser: required("PROXMOX_USER"),
    proxmoxPass: required("PROXMOX_PASS"),
    proxmoxRealm: process.env["PROXMOX_REALM"] ?? "pam",
    tlsRejectUnauthorized:
      (process.env["PROXMOX_TLS_REJECT_UNAUTHORIZED"] ?? "false") !== "false",
    redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
    pollIntervalMs: parseInt(process.env["POLL_INTERVAL_MS"] ?? "15000", 10),
    logLevel: (process.env["LOG_LEVEL"] as WorkerConfig["logLevel"]) ?? "info",
  };
}

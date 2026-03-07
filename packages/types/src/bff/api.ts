// BFF server connection types — these are the types the frontend uses to talk to the NestJS BFF

/** A Proxmox server record as stored in the BFF (never has passwords) */
export interface ServerConnection {
  id: string;
  label: string;
  host: string;
  port: number;
  /** TLS trust configuration */
  tlsMode: "system" | "self-signed" | "insecure";
  lastConnectedAt?: number;
  /** Whether this is the currently active connection */
  active?: boolean;
}

/** Login request body sent from the browser to the BFF */
export interface LoginRequest {
  serverId?: string; // re-auth to a known server
  host?: string; // or new connection
  port?: number;
  username: string;
  password: string;
  realm: string;
  tlsMode?: "system" | "self-signed" | "insecure";
  label?: string;
  saveServer?: boolean;
}

/** Login response returned by the BFF to the browser (no ticket or CSRF in the body) */
export interface LoginResponse {
  sessionId: string;
  username: string;
  realm: string;
  server: ServerConnection;
  expiresAt: number;
}

/** Proxmox API response envelope */
export interface ProxmoxApiResponse<T> {
  data: T;
}

/** BFF standard response envelope */
export interface BffResponse<T> {
  data: T;
  meta?: {
    cachedAt?: number;
    nodeId?: string;
  };
}

/** BFF error response */
export interface BffError {
  statusCode: number;
  message: string;
  error?: string;
}

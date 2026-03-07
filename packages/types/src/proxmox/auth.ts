// Proxmox VE authentication domain types

/** Proxmox ticket-based auth response from POST /access/ticket */
export interface ProxmoxAuthTicket {
  ticket: string;
  CSRFPreventionToken: string;
  username: string;
  /** ISO 8601 expiry timestamp */
  expire: number;
  clustername?: string;
}

/** Auth realm type supported by Proxmox */
export type ProxmoxRealm = "pam" | "pve" | string;

/** Credentials payload for login (never persisted) */
export interface ProxmoxLoginCredentials {
  host: string;
  port: number;
  username: string;
  /** Plain text password — only ever sent to the BFF, never stored */
  password: string;
  realm: ProxmoxRealm;
}

/** Active session state held in the BFF */
export interface ProxmoxSession {
  id: string;
  serverId: string;
  username: string;
  realm: ProxmoxRealm;
  /** Unix timestamp (seconds) */
  createdAt: number;
  /** Unix timestamp (seconds) when the ticket expires */
  expiresAt: number;
}

/** Auth token (API token alternative to ticket) */
export interface ProxmoxApiToken {
  tokenId: string;
  /** Format: USER@REALM!TOKENID */
  fullTokenId: string;
  comment?: string;
  expire?: number;
  privsReduced: boolean;
}

export type AuthMethod = "ticket" | "api-token";

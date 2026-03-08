// Lightweight Proxmox VE HTTP client for the polling worker.
// Mirrors the patterns in apps/api/src/modules/proxmox/proxmox-http.service.ts
// without the NestJS DI overhead.

import axios, { AxiosInstance } from "axios";
import * as https from "https";
import type { WorkerConfig } from "./config";

interface ProxmoxAuthTicket {
  ticket: string;
  CSRFPreventionToken: string;
  username: string;
  expire: number;
}

interface ProxmoxApiResponse<T> {
  data: T;
}

export interface ProxmoxSession {
  ticket: string;
  csrfToken: string;
  username: string;
  expiresAt: number; // unix ms
}

export class ProxmoxClient {
  private readonly baseUrl: string;
  private readonly httpsAgent: https.Agent;

  constructor(private readonly cfg: WorkerConfig) {
    this.baseUrl = `https://${cfg.proxmoxHost}:${cfg.proxmoxPort}/api2/json`;
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: cfg.tlsRejectUnauthorized,
    });
  }

  async authenticate(): Promise<ProxmoxSession> {
    const client = axios.create({
      baseURL: this.baseUrl,
      httpsAgent: this.httpsAgent,
      timeout: 15_000,
    });

    const res = await client.post<ProxmoxApiResponse<ProxmoxAuthTicket>>(
      "/access/ticket",
      new URLSearchParams({
        username: `${this.cfg.proxmoxUser}@${this.cfg.proxmoxRealm}`,
        password: this.cfg.proxmoxPass,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const { ticket, CSRFPreventionToken, expire } = res.data.data;
    return {
      ticket,
      csrfToken: CSRFPreventionToken,
      username: res.data.data.username,
      // Proxmox tickets expire in 2 hours; subtract 5 min for safety
      expiresAt: expire * 1000 - 5 * 60 * 1000,
    };
  }

  buildClient(session: ProxmoxSession): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      httpsAgent: this.httpsAgent,
      timeout: 15_000,
      headers: {
        Cookie: `PVEAuthCookie=${session.ticket}`,
        CSRFPreventionToken: session.csrfToken,
      },
    });
  }

  async get<T>(session: ProxmoxSession, path: string): Promise<T> {
    const client = this.buildClient(session);
    const res = await client.get<ProxmoxApiResponse<T>>(path);
    return res.data.data;
  }
}

import { Injectable } from "@nestjs/common";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import * as https from "https";
import type { ProxmoxApiResponse } from "@proxmox-admin/types";

export interface ProxmoxClientConfig {
  baseUrl: string;
  tlsMode: "system" | "self-signed" | "insecure";
  ticket?: string;
  csrfToken?: string;
  apiToken?: string;
}

@Injectable()
export class ProxmoxHttpService {
  buildClient(cfg: ProxmoxClientConfig): AxiosInstance {
    const httpsAgent =
      cfg.tlsMode === "insecure" || cfg.tlsMode === "self-signed"
        ? new https.Agent({
            rejectUnauthorized: cfg.tlsMode !== "insecure" && false,
          })
        : new https.Agent();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (cfg.apiToken) {
      headers["Authorization"] = `PVEAPIToken=${cfg.apiToken}`;
    } else if (cfg.ticket) {
      headers["Cookie"] = `PVEAuthCookie=${cfg.ticket}`;
      if (cfg.csrfToken) {
        headers["CSRFPreventionToken"] = cfg.csrfToken;
      }
    }

    return axios.create({
      baseURL: cfg.baseUrl,
      httpsAgent,
      headers,
      timeout: 15_000,
    });
  }

  async get<T>(
    client: AxiosInstance,
    path: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await client.get<ProxmoxApiResponse<T>>(path, config);
    return response.data.data;
  }

  async post<T>(
    client: AxiosInstance,
    path: string,
    data?: unknown,
  ): Promise<T> {
    const response = await client.post<ProxmoxApiResponse<T>>(path, data);
    return response.data.data;
  }

  async put<T>(
    client: AxiosInstance,
    path: string,
    data?: unknown,
  ): Promise<T> {
    const response = await client.put<ProxmoxApiResponse<T>>(path, data);
    return response.data.data;
  }

  async delete<T>(client: AxiosInstance, path: string): Promise<T> {
    const response = await client.delete<ProxmoxApiResponse<T>>(path);
    return response.data.data;
  }

  buildBaseUrl(host: string, port: number): string {
    return `https://${host}:${port}/api2/json`;
  }
}

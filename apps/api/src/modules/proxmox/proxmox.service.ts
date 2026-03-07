import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ProxmoxHttpService } from "./proxmox-http.service";
import type { ProxmoxAuthTicket } from "@proxmox-admin/types";

export interface ServerRef {
  host: string;
  port: number;
  tlsMode: "system" | "self-signed" | "insecure";
}

export interface SessionCredentials {
  ticket: string;
  csrfToken: string;
  username: string;
  expire: number;
}

@Injectable()
export class ProxmoxService {
  constructor(private readonly http: ProxmoxHttpService) {}

  async authenticate(
    server: ServerRef,
    username: string,
    password: string,
    realm: string,
  ): Promise<SessionCredentials> {
    const baseUrl = this.http.buildBaseUrl(server.host, server.port);
    const client = this.http.buildClient({ baseUrl, tlsMode: server.tlsMode });

    try {
      const ticket = await this.http.post<ProxmoxAuthTicket>(
        client,
        "/access/ticket",
        {
          username: `${username}@${realm}`,
          password,
        },
      );

      return {
        ticket: ticket.ticket,
        csrfToken: ticket.CSRFPreventionToken,
        username: ticket.username,
        expire: ticket.expire,
      };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        throw new UnauthorizedException("Invalid credentials");
      }
      throw err;
    }
  }

  buildAuthenticatedClient(server: ServerRef, session: SessionCredentials) {
    const baseUrl = this.http.buildBaseUrl(server.host, server.port);
    return this.http.buildClient({
      baseUrl,
      tlsMode: server.tlsMode,
      ticket: session.ticket,
      csrfToken: session.csrfToken,
    });
  }
}

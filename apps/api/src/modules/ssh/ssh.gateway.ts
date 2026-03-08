import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server as WsServer } from "ws";
import type { WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Client as SshClient } from "ssh2";
import type { ConnectConfig } from "ssh2";
import type { ClientChannel } from "ssh2";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SESSION_COOKIE } from "../../guards/session.guard";
import type {
  SshClientMessage,
  SshServerMessage,
  SshInitMessage,
} from "@proxmox-admin/types";

/** Minimal cookie header parser — avoids the untyped `cookie` package. */
function parseCookies(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

interface SocketState {
  /** The pxa_session cookie value — used to re-validate before opening SSH. */
  sessionId: string;
  ssh?: SshClient;
  stream?: ClientChannel;
}

// WebSocket readyState constants (same as browser WebSocket API)
const WS_OPEN = 1;

@WebSocketGateway({ path: "/ws/ssh" })
export class SshGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() readonly server!: WsServer;

  private readonly logger = new Logger(SshGateway.name);
  private readonly sockets = new Map<WebSocket, SocketState>();

  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Gateway lifecycle ────────────────────────────────────────────────────

  handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE];

    if (!sessionId) {
      ws.close(4001, "Unauthorized — no session cookie");
      return;
    }

    try {
      this.auth.requireSession(sessionId);
    } catch {
      ws.close(4001, "Unauthorized — session invalid or expired");
      return;
    }

    this.sockets.set(ws, { sessionId });

    ws.on("message", (raw) => {
      this.handleMessage(ws, raw.toString()).catch((err: Error) => {
        this.logger.error("SSH gateway error", err.stack);
        this.send(ws, { type: "error", message: err.message });
        ws.close();
      });
    });
  }

  handleDisconnect(ws: WebSocket): void {
    const state = this.sockets.get(ws);
    if (state) {
      state.stream?.close();
      state.ssh?.end();
      this.sockets.delete(ws);
    }
  }

  // ── Message dispatch ─────────────────────────────────────────────────────

  private async handleMessage(ws: WebSocket, raw: string): Promise<void> {
    const msg = JSON.parse(raw) as SshClientMessage;

    switch (msg.type) {
      case "ping":
        this.send(ws, { type: "pong" });
        break;
      case "init":
        await this.initSession(ws, msg);
        break;
      case "input": {
        const state = this.sockets.get(ws);
        state?.stream?.write(msg.data);
        break;
      }
      case "resize": {
        const state = this.sockets.get(ws);
        // ssh2 ClientChannel exposes setWindow for PTY resize
        (
          state?.stream as NodeJS.ReadWriteStream & {
            setWindow?: (...a: number[]) => void;
          }
        )?.setWindow?.(msg.rows, msg.cols, 0, 0);
        break;
      }
    }
  }

  // ── SSH session ──────────────────────────────────────────────────────────

  private async initSession(ws: WebSocket, msg: SshInitMessage): Promise<void> {
    const state = this.sockets.get(ws);
    if (!state) return;

    // Re-validate session to get server configuration and stored SSH creds
    const session = this.auth.requireSession(state.sessionId);
    const { host } = await this.resolveServerHost(session.serverId);

    // Resolve SSH credentials: prefer message-supplied creds, fall back to
    // session creds for PAM users, send needs-credentials if nothing is available.
    const username = msg.username || session.sshUsername;
    const password =
      msg.password || (msg.username ? undefined : session.sshPassword);
    const privateKey = msg.privateKey;

    if (!username && !privateKey) {
      this.send(ws, { type: "needs-credentials" });
      return;
    }

    const ssh = new SshClient();
    state.ssh = ssh;

    ssh.on("ready", () => {
      // For LXC: attach to the container shell via pct enter
      // For QEMU: attach to the serial console via qm terminal
      const command =
        msg.guestType === "lxc"
          ? `pct enter ${msg.vmid}`
          : `qm terminal ${msg.vmid}`;

      ssh.exec(
        command,
        {
          pty: {
            term: "xterm-256color",
            cols: msg.cols,
            rows: msg.rows,
            width: 0,
            height: 0,
            modes: {},
          },
        },
        (err, stream) => {
          if (err) {
            this.send(ws, { type: "error", message: err.message });
            ws.close();
            return;
          }

          state.stream = stream;
          this.send(ws, { type: "ready" });

          stream.on("data", (data: Buffer) => {
            this.send(ws, { type: "output", data: data.toString("utf8") });
          });

          stream.stderr.on("data", (data: Buffer) => {
            this.send(ws, { type: "output", data: data.toString("utf8") });
          });

          stream.on("close", () => {
            this.send(ws, { type: "closed" });
            ws.close();
          });
        },
      );
    });

    ssh.on("error", (err) => {
      this.logger.warn(`SSH error for ${host}: ${err.message}`);
      this.send(ws, { type: "error", message: `SSH error: ${err.message}` });
      ws.close();
    });

    const connectConfig: ConnectConfig = {
      host,
      port: 22,
      username: username!,
      readyTimeout: 15_000,
    };

    if (privateKey) {
      connectConfig.privateKey = privateKey;
    } else if (password) {
      connectConfig.password = password;
    }

    ssh.connect(connectConfig);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Resolves the Proxmox host from a serverId.  Mirrors the same logic used in
   * GuestsController so ephemeral and persisted servers both work.
   */
  private async resolveServerHost(serverId: string): Promise<{ host: string }> {
    if (serverId.startsWith("ephemeral:")) {
      const [, host] = serverId.split(":");
      return { host };
    }
    const server = await this.prisma.knownServer.findUniqueOrThrow({
      where: { id: serverId },
    });
    return { host: server.host };
  }

  private send(ws: WebSocket, msg: SshServerMessage): void {
    if (ws.readyState === WS_OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}

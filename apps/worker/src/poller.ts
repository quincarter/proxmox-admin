// Proxmox polling logic: authenticates, polls nodes/guests/storage/tasks,
// and publishes typed SSE events to Redis for the BFF to stream to clients.

import type { WorkerConfig } from "./config";
import { ProxmoxClient, type ProxmoxSession } from "./proxmox-client";
import type { Publisher } from "./publisher";

// Minimal inline types matching @proxmox-admin/types without a direct dependency
// (the types package emits declarations only; no JS runtime output).
interface NodeSummary {
  node: string;
  status: string;
  id: string;
  type: "node";
  [key: string]: unknown;
}

interface AnyGuest {
  vmid: number;
  name: string;
  node: string;
  type: "qemu" | "lxc";
  status: string;
  [key: string]: unknown;
}

interface StorageSummary {
  storage: string;
  type: string;
  [key: string]: unknown;
}

interface TaskSummary {
  upid: string;
  node: string;
  [key: string]: unknown;
}

export class Poller {
  private readonly client: ProxmoxClient;
  private session: ProxmoxSession | null = null;
  private logger: (msg: string) => void;

  constructor(
    private readonly cfg: WorkerConfig,
    private readonly publisher: Publisher,
  ) {
    this.client = new ProxmoxClient(cfg);
    this.logger =
      cfg.logLevel === "debug"
        ? (msg) => console.log(`[poller] ${msg}`)
        : (msg) => console.log(`[poller] ${msg}`);
  }

  private async getSession(): Promise<ProxmoxSession> {
    if (this.session && Date.now() < this.session.expiresAt) {
      return this.session;
    }
    this.logger("Authenticating with Proxmox...");
    this.session = await this.client.authenticate();
    this.logger(`Authenticated as ${this.session.username}`);
    return this.session;
  }

  async poll(): Promise<void> {
    let session: ProxmoxSession;
    try {
      session = await this.getSession();
    } catch (err: unknown) {
      console.error("[poller] Authentication failed:", (err as Error).message);
      this.session = null;
      return;
    }

    try {
      await this.pollNodes(session);
    } catch (err: unknown) {
      console.error("[poller] Poll failed:", (err as Error).message);
      // If 401, force re-auth next cycle
      const status = (err as { response?: { status?: number } }).response
        ?.status;
      if (status === 401) {
        this.session = null;
      }
    }
  }

  private async pollNodes(session: ProxmoxSession): Promise<void> {
    const nodes = await this.client.get<NodeSummary[]>(session, "/nodes");

    await this.publisher.publishNodes({
      type: "node-status",
      nodes,
      timestamp: Date.now(),
    });

    if (this.cfg.logLevel === "debug") {
      this.logger(`Published ${nodes.length} node(s)`);
    }

    // Poll each node in parallel (guests, storage, recent tasks)
    await Promise.allSettled(
      nodes
        .filter((n) => n.status === "online")
        .map((n) => this.pollNode(session, n.node)),
    );
  }

  private async pollNode(session: ProxmoxSession, node: string): Promise<void> {
    const [guests, storage, tasks] = await Promise.allSettled([
      this.client.get<AnyGuest[]>(session, `/cluster/resources?type=vm`),
      this.client.get<StorageSummary[]>(session, `/nodes/${node}/storage`),
      this.client.get<TaskSummary[]>(
        session,
        `/nodes/${node}/tasks?limit=25&source=all`,
      ),
    ]);

    if (guests.status === "fulfilled") {
      // Filter to only guests on this node
      const nodeGuests = guests.value.filter((g) => g.node === node);
      await this.publisher.publishGuests({
        type: "guest-status",
        guests: nodeGuests,
        node,
        timestamp: Date.now(),
      });
    }

    if (storage.status === "fulfilled") {
      await this.publisher.publishStorage({
        type: "storage-update",
        storage: storage.value,
        node,
        timestamp: Date.now(),
      });
    }

    if (tasks.status === "fulfilled") {
      await this.publisher.publishTasks({
        type: "task-update",
        tasks: tasks.value,
        node,
        timestamp: Date.now(),
      });
    }
  }
}

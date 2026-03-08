// Entry point for the Proxmox polling worker.
// Connects to Redis, authenticates with Proxmox, and polls on a fixed interval.

import { loadConfig } from "./config";
import { Publisher } from "./publisher";
import { Poller } from "./poller";

async function main(): Promise<void> {
  const cfg = loadConfig();
  console.log(
    `[worker] Starting — host=${cfg.proxmoxHost}:${cfg.proxmoxPort} interval=${cfg.pollIntervalMs}ms`,
  );

  const publisher = new Publisher(cfg.redisUrl);
  await publisher.connect();
  console.log(`[worker] Connected to Redis at ${cfg.redisUrl}`);

  const poller = new Poller(cfg, publisher);

  // Initial poll immediately on startup
  await poller.poll();

  const interval = setInterval(() => {
    poller.poll().catch((err: unknown) => {
      console.error("[worker] Unhandled poll error:", (err as Error).message);
    });
  }, cfg.pollIntervalMs);

  // Clean shutdown
  const shutdown = async (): Promise<void> => {
    console.log("[worker] Shutting down...");
    clearInterval(interval);
    await publisher.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    shutdown().catch(console.error);
  });
  process.on("SIGINT", () => {
    shutdown().catch(console.error);
  });
}

main().catch((err: unknown) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});

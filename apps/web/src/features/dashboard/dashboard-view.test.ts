import { html, fixture, expect } from "@open-wc/testing";
import { vi } from "vitest";
import type { NodeSummary, AnyGuest, StorageSummary } from "@proxmox-admin/types";
import type { DashboardView } from "./dashboard-view";

// ── Signal mock (must be hoisted before vi.mock) ─────────────────────────────

const liveNodesMock = vi.hoisted(
  (): { value: NodeSummary[] | null } => ({ value: null }),
);

vi.mock("../../app/event-stream.ts", () => ({
  liveNodes: liveNodesMock,
  connectEventStream: vi.fn(),
  disconnectEventStream: vi.fn(),
}));

// ── API mock ─────────────────────────────────────────────────────────────────

const mockNodes: NodeSummary[] = [
  {
    node: "pve1",
    status: "online",
    ip: "192.168.1.100",
    id: "node/pve1",
    type: "node",
    usage: {
      cpu: 0.4,
      maxcpu: 8,
      mem: 4 * 1024 ** 3,
      maxmem: 16 * 1024 ** 3,
      disk: 20 * 1024 ** 3,
      maxdisk: 100 * 1024 ** 3,
      uptime: 7200,
      loadavg: [1.2, 0.9, 0.8],
    },
  },
  {
    node: "pve2",
    status: "online",
    ip: "192.168.1.101",
    id: "node/pve2",
    type: "node",
    usage: {
      cpu: 0.2,
      maxcpu: 4,
      mem: 2 * 1024 ** 3,
      maxmem: 8 * 1024 ** 3,
      disk: 10 * 1024 ** 3,
      maxdisk: 50 * 1024 ** 3,
      uptime: 3600,
      loadavg: [0.5, 0.4, 0.3],
    },
  },
  {
    node: "pve3",
    status: "offline",
    id: "node/pve3",
    type: "node",
    // usage intentionally absent — reproduced the runtime error
    usage: undefined as unknown as NodeSummary["usage"],
  },
];

const mockGuests: AnyGuest[] = [
  {
    vmid: 100,
    node: "pve1",
    type: "qemu",
    status: "running",
    name: "vm-100",
    cpu: 0.1,
    cpus: 2,
    mem: 512 * 1024 ** 2,
    maxmem: 2 * 1024 ** 3,
    uptime: 3600,
    netin: 0,
    netout: 0,
    diskread: 0,
    diskwrite: 0,
  },
  {
    vmid: 200,
    node: "pve2",
    type: "lxc",
    status: "stopped",
    name: "ct-200",
    cpu: 0,
    cpus: 1,
    mem: 0,
    maxmem: 512 * 1024 ** 2,
    uptime: 0,
    netin: 0,
    netout: 0,
    diskread: 0,
    diskwrite: 0,
  },
];

const mockStorage: StorageSummary[] = [
  {
    node: "pve1",
    storage: "local",
    type: "dir",
    status: "active",
    avail: 80 * 1024 ** 3,
    used: 20 * 1024 ** 3,
    total: 100 * 1024 ** 3,
    enabled: true,
    shared: false,
    content: ["images", "iso"],
  },
];

vi.mock("../../app/api.ts", () => ({
  nodesApi: {
    list: vi.fn().mockResolvedValue(mockNodes),
  },
  guestsApi: {
    listAll: vi.fn().mockResolvedValue(mockGuests),
  },
  storageApi: {
    listAll: vi.fn().mockResolvedValue(mockStorage),
  },
}));

import "./dashboard-view";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderDashboard() {
  liveNodesMock.value = null;
  const el = await fixture<DashboardView>(
    html`<pxa-dashboard-view></pxa-dashboard-view>`,
  );
  // Wait for all async tasks to complete
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("pxa-dashboard-view — datacenter metrics", () => {
  it("renders the Datacenter section heading", async () => {
    const el = await renderDashboard();
    const titles = Array.from(
      el.shadowRoot!.querySelectorAll(".section-title"),
    ).map((e) => e.textContent?.trim());
    expect(titles).to.include("Datacenter");
  });

  it("renders CPU and Memory dc-cards", async () => {
    const el = await renderDashboard();
    const dcCards = el.shadowRoot!.querySelectorAll(".dc-card");
    expect(dcCards.length).to.equal(2);
    const labels = Array.from(dcCards).map(
      (c) => c.querySelector(".dc-label")?.textContent?.trim(),
    );
    expect(labels).to.deep.equal(["CPU", "Memory"]);
  });

  it("does not throw when an offline node has no usage object", async () => {
    // This reproduces the runtime error: offline node with undefined usage
    const nodesWithOffline = [
      ...mockNodes,
      {
        node: "broke",
        status: "offline" as const,
        id: "node/broke",
        type: "node" as const,
        usage: undefined as unknown as NodeSummary["usage"],
      },
    ];
    // Should not throw during reduce
    const { nodesApi } = await import("../../app/api.ts");
    vi.mocked(nodesApi.list).mockResolvedValueOnce(nodesWithOffline);
    // If this fixture resolves without error the bug is fixed
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    // Datacenter section must still render
    const dcMetrics = el.shadowRoot!.querySelector(".dc-metrics");
    expect(dcMetrics).to.exist;
  });

  it("computes weighted CPU fraction across online nodes only", async () => {
    const el = await renderDashboard();
    // pve1: 0.4 * 8 = 3.2 cores; pve2: 0.2 * 4 = 0.8 cores => used=4.0, total=12
    // => 4.0/12 ≈ 33.3%
    const cpuValue = el.shadowRoot!
      .querySelector(".dc-card .dc-value")
      ?.textContent?.trim();
    expect(cpuValue).to.equal("33.3%");
  });

  it("computes aggregate memory fraction across online nodes only", async () => {
    const el = await renderDashboard();
    // pve1: 4GB / 16GB; pve2: 2GB / 8GB => used=6GB, total=24GB => 25.0%
    const dcCards = el.shadowRoot!.querySelectorAll(".dc-card");
    const memValue = dcCards[1]
      .querySelector(".dc-value")
      ?.textContent?.trim();
    expect(memValue).to.equal("25.0%");
  });

  it("shows memory as formatted bytes in the sub-line", async () => {
    const el = await renderDashboard();
    const dcCards = el.shadowRoot!.querySelectorAll(".dc-card");
    const subs = Array.from(dcCards[1].querySelectorAll(".dc-sub")).map((s) =>
      s.textContent?.replace(/\s+/g, " ").trim(),
    );
    // 6 GB used / 24 GB total; 2 nodes online
    expect(subs[0]).to.include("6.0 GB");
    expect(subs[0]).to.include("24.0 GB");
    expect(subs[1]).to.include("2 nodes online");
  });

  it("shows singular 'node online' when exactly one node is online", async () => {
    const { nodesApi } = await import("../../app/api.ts");
    vi.mocked(nodesApi.list).mockResolvedValueOnce([mockNodes[0]!]);
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const subs = Array.from(
      el.shadowRoot!.querySelectorAll(".dc-card .dc-sub"),
    ).map((s) => s.textContent?.trim());
    expect(subs.some((s) => s === "1 node online")).to.be.true;
  });

  it("shows 0% CPU and Memory when all nodes are offline", async () => {
    const { nodesApi } = await import("../../app/api.ts");
    vi.mocked(nodesApi.list).mockResolvedValueOnce([mockNodes[2]!]); // offline only
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const values = Array.from(
      el.shadowRoot!.querySelectorAll(".dc-value"),
    ).map((v) => v.textContent?.trim());
    expect(values[0]).to.equal("0.0%");
    expect(values[1]).to.equal("0.0%");
  });

  it("does not render the Live badge when liveNodes signal is null", async () => {
    liveNodesMock.value = null;
    const el = await renderDashboard();
    const badge = el.shadowRoot!.querySelector(".dc-live-badge");
    expect(badge).to.be.null;
  });

  it("renders the Live badge when liveNodes signal has data", async () => {
    liveNodesMock.value = mockNodes;
    const el = await renderDashboard();
    const badge = el.shadowRoot!.querySelector(".dc-live-badge");
    expect(badge).to.exist;
    expect(badge!.textContent).to.include("Live");
  });
});

describe("pxa-dashboard-view — summary stat cards", () => {
  it("renders the nodes online stat card", async () => {
    const el = await renderDashboard();
    const cards = Array.from(el.shadowRoot!.querySelectorAll(".stat-card"));
    const nodesCard = cards.find((c) =>
      c.querySelector(".stat-label")?.textContent?.includes("Nodes"),
    );
    expect(nodesCard).to.exist;
    // 2 online of 3 total (pve3 is offline)
    expect(nodesCard!.querySelector(".stat-value")?.textContent?.trim()).to.equal(
      "2 / 3",
    );
  });

  it("renders the guests running stat card", async () => {
    const el = await renderDashboard();
    const cards = Array.from(el.shadowRoot!.querySelectorAll(".stat-card"));
    const guestsCard = cards.find((c) =>
      c.querySelector(".stat-label")?.textContent?.includes("Guests"),
    );
    expect(guestsCard).to.exist;
    // 1 running of 2 total
    expect(guestsCard!.querySelector(".stat-value")?.textContent?.trim()).to.equal(
      "1 / 2",
    );
  });

  it("renders the storage pools stat card", async () => {
    const el = await renderDashboard();
    const cards = Array.from(el.shadowRoot!.querySelectorAll(".stat-card"));
    const storageCard = cards.find((c) =>
      c.querySelector(".stat-label")?.textContent?.includes("Storage"),
    );
    expect(storageCard).to.exist;
    expect(storageCard!.querySelector(".stat-value")?.textContent?.trim()).to.equal(
      "1",
    );
  });
});

describe("pxa-dashboard-view — nodes table", () => {
  it("renders a row per node", async () => {
    const el = await renderDashboard();
    const rows = el.shadowRoot!.querySelectorAll("tbody tr");
    expect(rows.length).to.equal(3);
  });

  it("shows node names in the first column", async () => {
    const el = await renderDashboard();
    const names = Array.from(
      el.shadowRoot!.querySelectorAll("tbody tr td.name"),
    ).map((td) => td.textContent?.trim());
    expect(names).to.include("pve1");
    expect(names).to.include("pve2");
    expect(names).to.include("pve3");
  });

  it("renders a status badge for each node", async () => {
    const el = await renderDashboard();
    const badges = el.shadowRoot!.querySelectorAll("pxa-status-badge");
    expect(badges.length).to.equal(3);
  });

  it("shows loading state while tasks are pending", async () => {
    const { nodesApi } = await import("../../app/api.ts");
    // Return a promise that never resolves during this test
    vi.mocked(nodesApi.list).mockReturnValueOnce(new Promise(() => {}));
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    const loading = el.shadowRoot!.querySelector(".loading");
    expect(loading).to.exist;
    expect(loading!.textContent).to.include("Loading");
  });

  it("shows error state when nodes API fails", async () => {
    const { nodesApi } = await import("../../app/api.ts");
    vi.mocked(nodesApi.list).mockRejectedValueOnce(new Error("timeout"));
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const err = el.shadowRoot!.querySelector(".error");
    expect(err).to.exist;
    expect(err!.textContent).to.include("Failed");
  });
});

describe("pxa-dashboard-view — live signal override", () => {
  it("prefers liveNodes signal data over polled data", async () => {
    const liveOnlyNode: NodeSummary = {
      node: "live-node",
      status: "online",
      id: "node/live-node",
      type: "node",
      usage: {
        cpu: 0.9,
        maxcpu: 2,
        mem: 1 * 1024 ** 3,
        maxmem: 2 * 1024 ** 3,
        disk: 0,
        maxdisk: 0,
        uptime: 100,
        loadavg: [0.9, 0.8, 0.7],
      },
    };
    liveNodesMock.value = [liveOnlyNode];
    const el = await renderDashboard();
    const names = Array.from(
      el.shadowRoot!.querySelectorAll("tbody tr td.name"),
    ).map((td) => td.textContent?.trim());
    // Should render live node, not polled mock nodes
    expect(names).to.deep.equal(["live-node"]);
    liveNodesMock.value = null; // reset
  });
});

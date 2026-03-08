import { html, fixture, expect } from "@open-wc/testing";
import { vi } from "vitest";
import type { NodeSummary, AnyGuest, StorageSummary } from "@proxmox-admin/types";
import type { DashboardView } from "./dashboard-view";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file by the Vitest transform,
// so any data they reference must also be hoisted with vi.hoisted().

const liveNodesMock = vi.hoisted(
  (): { value: NodeSummary[] | null } => ({ value: null }),
);

const mocks = vi.hoisted(() => {
  const nodes: NodeSummary[] = [
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
      // Offline node with no usage object — this is what caused the runtime error.
      node: "pve3",
      status: "offline",
      id: "node/pve3",
      type: "node",
      usage: undefined as unknown as NodeSummary["usage"],
    },
  ];

  const guests: AnyGuest[] = [
    {
      vmid: 100,
      node: "pve1",
      type: "qemu",
      status: "running",
      name: "vm-100",
      cpu: 0.1,
      maxcpu: 2,
      mem: 512 * 1024 ** 2,
      maxmem: 2 * 1024 ** 3,
      disk: 0,
      maxdisk: 20 * 1024 ** 3,
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
      maxcpu: 1,
      mem: 0,
      maxmem: 512 * 1024 ** 2,
      disk: 0,
      maxdisk: 8 * 1024 ** 3,
      uptime: 0,
      netin: 0,
      netout: 0,
    },
  ];

  const storage: StorageSummary[] = [
    {
      storage: "local",
      type: "dir",
      status: "active",
      avail: 80 * 1024 ** 3,
      used: 20 * 1024 ** 3,
      total: 100 * 1024 ** 3,
      enabled: true,
      shared: false,
      content: "images,iso",
    },
  ];

  return {
    listNodes: vi.fn().mockResolvedValue(nodes),
    listGuests: vi.fn().mockResolvedValue(guests),
    listStorage: vi.fn().mockResolvedValue(storage),
    nodes,
    guests,
    storage,
  };
});

vi.mock("../../app/event-stream.ts", () => ({
  liveNodes: liveNodesMock,
  connectEventStream: vi.fn(),
  disconnectEventStream: vi.fn(),
}));

vi.mock("../../app/api.ts", () => ({
  nodesApi: { list: mocks.listNodes },
  guestsApi: { listAll: mocks.listGuests },
  storageApi: { listAll: mocks.listStorage },
}));

import "./dashboard-view";

// ── Helper ────────────────────────────────────────────────────────────────────

async function renderDashboard(): Promise<DashboardView> {
  liveNodesMock.value = null;
  mocks.listNodes.mockResolvedValue(mocks.nodes);
  mocks.listGuests.mockResolvedValue(mocks.guests);
  mocks.listStorage.mockResolvedValue(mocks.storage);

  const el = await fixture<DashboardView>(
    html`<pxa-dashboard-view></pxa-dashboard-view>`,
  );
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
    // Directly exercises the bug: offline node with undefined usage in reduce
    const el = await renderDashboard();
    const dcMetrics = el.shadowRoot!.querySelector(".dc-metrics");
    expect(dcMetrics).to.exist;
  });

  it("computes weighted CPU fraction across online nodes only", async () => {
    // pve1: 0.4 × 8 = 3.2 cores; pve2: 0.2 × 4 = 0.8 cores
    // => 4.0 used / 12 total = 33.3%
    const el = await renderDashboard();
    const cpuValue = el.shadowRoot!
      .querySelector(".dc-card .dc-value")
      ?.textContent?.trim();
    expect(cpuValue).to.equal("33.3%");
  });

  it("computes aggregate memory fraction across online nodes only", async () => {
    // pve1: 4 GB / 16 GB; pve2: 2 GB / 8 GB => 6 GB / 24 GB = 25.0%
    const el = await renderDashboard();
    const dcCards = el.shadowRoot!.querySelectorAll(".dc-card");
    const memValue = dcCards[1]
      .querySelector(".dc-value")
      ?.textContent?.trim();
    expect(memValue).to.equal("25.0%");
  });

  it("shows formatted bytes in the memory sub-line", async () => {
    const el = await renderDashboard();
    const dcCards = el.shadowRoot!.querySelectorAll(".dc-card");
    const subs = Array.from(dcCards[1].querySelectorAll(".dc-sub")).map((s) =>
      s.textContent?.replace(/\s+/g, " ").trim(),
    );
    // _formatBytes divides by 1e9 (decimal GB), not 1024^3
    // pve1 mem: 4*1024^3 ≈ 4.3 GB; pve2 mem: 2*1024^3 ≈ 2.1 GB → total ≈ 6.4 GB
    // pve1 maxmem: 16*1024^3 ≈ 17.2 GB; pve2 maxmem: 8*1024^3 ≈ 8.6 GB → total ≈ 25.8 GB
    expect(subs[0]).to.include("6.4 GB");
    expect(subs[0]).to.include("25.8 GB");
  });

  it("shows node count in the sub-line", async () => {
    const el = await renderDashboard();
    const subs = Array.from(
      el.shadowRoot!.querySelectorAll(".dc-card .dc-sub"),
    ).map((s) => s.textContent?.trim());
    expect(subs.some((s) => s === "2 nodes online")).to.be.true;
  });

  it("shows singular 'node online' when exactly one node is online", async () => {
    mocks.listNodes.mockResolvedValueOnce([mocks.nodes[0]!]);
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

  it("shows 0.0% when all nodes are offline or have no usage", async () => {
    mocks.listNodes.mockResolvedValueOnce([mocks.nodes[2]!]); // offline only
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
    expect(el.shadowRoot!.querySelector(".dc-live-badge")).to.be.null;
  });

  it("renders the Live badge when liveNodes signal has data", async () => {
    // Set the signal BEFORE fixture creation so it is read during task completion
    liveNodesMock.value = mocks.nodes;
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector(".dc-live-badge");
    expect(badge).to.exist;
    expect(badge!.textContent?.trim()).to.include("Live");
    liveNodesMock.value = null;
  });
});

describe("pxa-dashboard-view — summary stat cards", () => {
  it("renders the Nodes online stat card", async () => {
    const el = await renderDashboard();
    const cards = Array.from(el.shadowRoot!.querySelectorAll(".stat-card"));
    const nodesCard = cards.find((c) =>
      c.querySelector(".stat-label")?.textContent?.includes("Nodes"),
    );
    expect(nodesCard).to.exist;
    // 2 online of 3 total
    expect(
      nodesCard!.querySelector(".stat-value")?.textContent?.trim(),
    ).to.equal("2 / 3");
  });

  it("renders the Guests running stat card", async () => {
    const el = await renderDashboard();
    const cards = Array.from(el.shadowRoot!.querySelectorAll(".stat-card"));
    const guestsCard = cards.find((c) =>
      c.querySelector(".stat-label")?.textContent?.includes("Guests"),
    );
    expect(guestsCard).to.exist;
    // 1 running of 2 total
    expect(
      guestsCard!.querySelector(".stat-value")?.textContent?.trim(),
    ).to.equal("1 / 2");
  });

  it("renders the Storage pools stat card", async () => {
    const el = await renderDashboard();
    const cards = Array.from(el.shadowRoot!.querySelectorAll(".stat-card"));
    const storageCard = cards.find((c) =>
      c.querySelector(".stat-label")?.textContent?.includes("Storage"),
    );
    expect(storageCard).to.exist;
    expect(
      storageCard!.querySelector(".stat-value")?.textContent?.trim(),
    ).to.equal("1");
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
    mocks.listNodes.mockReturnValueOnce(new Promise(() => {}));
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    const loading = el.shadowRoot!.querySelector(".loading");
    expect(loading).to.exist;
    expect(loading!.textContent).to.include("Loading");
  });

  it("shows error state when nodes API fails", async () => {
    mocks.listNodes.mockRejectedValueOnce(new Error("timeout"));
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
  it("prefers liveNodes signal over polled nodes for the table", async () => {
    const liveOnly: NodeSummary = {
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
    // Set signal BEFORE fixture so it is read during task completion
    liveNodesMock.value = [liveOnly];
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const names = Array.from(
      el.shadowRoot!.querySelectorAll("tbody tr td.name"),
    ).map((td) => td.textContent?.trim());
    expect(names).to.deep.equal(["live-node"]);
    liveNodesMock.value = null;
  });

  it("uses live node data for datacenter metrics when signal is set", async () => {
    const liveOnly: NodeSummary = {
      node: "live-node",
      status: "online",
      id: "node/live-node",
      type: "node",
      usage: {
        cpu: 1.0,
        maxcpu: 4,
        mem: 4 * 1024 ** 3,
        maxmem: 4 * 1024 ** 3,
        disk: 0,
        maxdisk: 0,
        uptime: 100,
        loadavg: [4.0, 3.5, 3.0],
      },
    };
    liveNodesMock.value = [liveOnly];
    const el = await fixture<DashboardView>(
      html`<pxa-dashboard-view></pxa-dashboard-view>`,
    );
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const cpuValue = el.shadowRoot!
      .querySelector(".dc-card .dc-value")
      ?.textContent?.trim();
    expect(cpuValue).to.equal("100.0%");
    liveNodesMock.value = null;
  });
});

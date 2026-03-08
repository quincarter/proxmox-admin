import { html, fixture, expect } from "@open-wc/testing";
import type { NodeDetailView } from "./node-detail-view";

vi.mock("../../app/api.ts", () => ({
  nodesApi: {
    get: vi.fn().mockResolvedValue({
      node: "proxmox",
      id: "node/proxmox",
      status: "online",
      version: { version: "8.0", release: "8" },
      subscription: null,
      ip: "192.168.1.1",
      usage: null,
    }),
    getTasks: vi.fn().mockResolvedValue([]),
  },
  guestsApi: {
    listLxc: vi.fn().mockResolvedValue([]),
    listQemu: vi.fn().mockResolvedValue([]),
    performGuestAction: vi.fn().mockResolvedValue("UPID:test"),
    getLxcSsh: vi.fn().mockResolvedValue(""),
    getQemuSsh: vi.fn().mockResolvedValue(""),
  },
}));

vi.mock("../../state/app.state.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../state/app.state.ts")>();
  return { ...mod, navigate: vi.fn() };
});

import "./node-detail-view";
import { guestsApi } from "../../app/api.ts";
import * as AppState from "../../state/app.state.ts";

async function waitForTasks(el: NodeDetailView): Promise<void> {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

describe("pxa-node-detail-view", () => {
  beforeEach(() => {
    vi.mocked(AppState.navigate).mockClear();
    vi.mocked(guestsApi.listLxc).mockResolvedValue([]);
    vi.mocked(guestsApi.listQemu).mockResolvedValue([]);
  });

  it("should set node property on LXC containers for navigation", async () => {
    vi.mocked(guestsApi.listLxc).mockResolvedValue([
      {
        vmid: 101,
        name: "ct1",
        type: "lxc",
        status: "running",
        cpu: 0.1,
        maxcpu: 2,
        mem: 512 * 1024 * 1024,
        maxmem: 1024 * 1024 * 1024,
        disk: 0,
        maxdisk: 0,
        netin: 0,
        netout: 0,
        uptime: 1000,
      } as any,
    ]);
    const el = await fixture<NodeDetailView>(
      html`<pxa-node-detail-view .node=${"proxmox"}></pxa-node-detail-view>`,
    );
    await waitForTasks(el);
    const rows = el.shadowRoot!.querySelectorAll(
      ".section .table-card tbody tr",
    );
    expect(rows.length).to.equal(1);
    (rows[0] as HTMLElement).click();
    expect(vi.mocked(AppState.navigate).mock.calls[0]?.[0]).to.equal(
      "/lxc/proxmox/101",
    );
  });

  it("should set node property on VMs for navigation", async () => {
    vi.mocked(guestsApi.listQemu).mockResolvedValue([
      {
        vmid: 100,
        name: "vm1",
        type: "qemu",
        status: "running",
        cpu: 0.2,
        maxcpu: 2,
        mem: 1024 * 1024 * 1024,
        maxmem: 2048 * 1024 * 1024,
        disk: 0,
        maxdisk: 0,
        netin: 0,
        netout: 0,
        uptime: 2000,
        diskread: 0,
        diskwrite: 0,
      } as any,
    ]);
    const el = await fixture<NodeDetailView>(
      html`<pxa-node-detail-view .node=${"proxmox"}></pxa-node-detail-view>`,
    );
    await waitForTasks(el);
    const rows = el.shadowRoot!.querySelectorAll(
      ".section .table-card tbody tr",
    );
    expect(rows.length).to.equal(1);
    (rows[0] as HTMLElement).click();
    expect(vi.mocked(AppState.navigate).mock.calls[0]?.[0]).to.equal(
      "/vm/proxmox/100",
    );
  });
});

import { html, fixture, expect } from "@open-wc/testing";
import { vi } from "vitest";
import type {
  GuestCurrentStatus,
  LxcConfig,
  LxcGuest,
} from "@proxmox-admin/types";
import type { LxcDetailView } from "./lxc-detail-view";

const liveGuestsMock = vi.hoisted(() => ({
  value: new Map<string, LxcGuest[]>(),
}));

vi.mock("../../app/event-stream.ts", () => ({
  liveGuests: liveGuestsMock,
  connectEventStream: vi.fn(),
  disconnectEventStream: vi.fn(),
}));

vi.mock("../../app/api.ts", () => ({
  guestsApi: {
    getLxcStatus: vi.fn(),
    getLxcConfig: vi.fn(),
    updateLxcConfig: vi.fn().mockResolvedValue(null),
    getLxcSshCommand: vi
      .fn()
      .mockResolvedValue({ command: "ssh root@127.0.0.1", fingerprint: "" }),
  },
}));

import "./lxc-detail-view";
import { guestsApi } from "../../app/api.ts";

const MOCK_STATUS: GuestCurrentStatus = {
  vmid: 101,
  node: "pve",
  name: "test-ct",
  type: "lxc",
  status: "running",
  cpu: 0.1,
  cpus: 2,
  mem: 256 * 1024 * 1024,
  maxmem: 512 * 1024 * 1024,
  disk: 1024 * 1024 * 1024,
  maxdisk: 8 * 1024 * 1024 * 1024,
  netin: 0,
  netout: 0,
  uptime: 3600,
};

const MOCK_CONFIG: LxcConfig = {
  vmid: 101,
  node: "pve",
  hostname: "test-ct",
  ostype: "debian",
  arch: "amd64",
  unprivileged: true,
  memory: 512,
  swap: 512,
  cores: 2,
  rootfs: "local:101/vm-101-disk-0.raw",
  onboot: false,
};

describe("pxa-lxc-detail-view SSH", () => {
  it("toggles the SSH terminal panel when the Terminal button is clicked", async () => {
    vi.mocked(guestsApi.getLxcStatus).mockResolvedValue(MOCK_STATUS);
    vi.mocked(guestsApi.getLxcConfig).mockResolvedValue(MOCK_CONFIG);

    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view
        node="proxmox"
        .vmid=${101}
      ></pxa-lxc-detail-view>`,
    );

    const btn = el.shadowRoot!.querySelector<HTMLElement>(".ssh-btn");
    expect(btn).to.exist;
    // Terminal panel should not be visible initially
    expect(el.shadowRoot!.querySelector("pxa-ssh-terminal")).to.be.null;

    btn!.click();
    await el.updateComplete;

    // After click the terminal panel and component should be rendered
    expect(el.shadowRoot!.querySelector("pxa-ssh-terminal")).to.exist;
    expect(el.shadowRoot!.querySelector(".ssh-terminal-panel")).to.exist;

    // Button label changes to "Hide Terminal"
    expect(btn!.textContent?.trim()).to.include("Hide Terminal");

    // Clicking again hides the panel
    btn!.click();
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector("pxa-ssh-terminal")).to.be.null;
  });
});

describe("pxa-lxc-detail-view tabs", () => {
  async function flushTasks(el: LxcDetailView) {
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
  }

  beforeEach(() => {
    vi.mocked(guestsApi.getLxcStatus).mockResolvedValue(MOCK_STATUS);
    vi.mocked(guestsApi.getLxcConfig).mockResolvedValue(MOCK_CONFIG);
  });

  it("renders tab navigation after status loads", async () => {
    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);
    expect(el.shadowRoot!.querySelector("nav.tabs")).to.exist;
  });

  it("has three tab buttons", async () => {
    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);
    const buttons = el.shadowRoot!.querySelectorAll(".tab-btn");
    expect(buttons.length).to.equal(3);
  });

  it("Summary tab is active by default", async () => {
    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);
    const active = el.shadowRoot!.querySelector(".tab-btn.active");
    expect(active).to.exist;
    expect(active!.textContent?.trim()).to.equal("Summary");
  });

  it("clicking Options tab activates it", async () => {
    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>(".tab-btn");
    tabs[1].click(); // Options is second
    await el.updateComplete;

    const active = el.shadowRoot!.querySelector(".tab-btn.active");
    expect(active!.textContent?.trim()).to.equal("Options");
  });

  it("clicking Resources tab activates it", async () => {
    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const tabs = el.shadowRoot!.querySelectorAll<HTMLElement>(".tab-btn");
    tabs[2].click(); // Resources is third
    await el.updateComplete;

    const active = el.shadowRoot!.querySelector(".tab-btn.active");
    expect(active!.textContent?.trim()).to.equal("Resources");
  });
});

describe("pxa-lxc-detail-view SSE live gauges", () => {
  async function flushTasks(el: LxcDetailView) {
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
    await Promise.resolve();
    await el.updateComplete;
  }

  const MOCK_LIVE_CT: LxcGuest = {
    vmid: 101,
    node: "pve",
    name: "test-ct",
    type: "lxc",
    status: "running",
    cpu: 0.6, // distinct from MOCK_STATUS.cpu = 0.1
    maxcpu: 2,
    mem: 400 * 1024 * 1024, // distinct from MOCK_STATUS.mem = 256 MB
    maxmem: 512 * 1024 * 1024,
    disk: 2 * 1024 * 1024 * 1024, // distinct from MOCK_STATUS.disk = 1 GB
    maxdisk: 8 * 1024 * 1024 * 1024,
    netin: 0,
    netout: 0,
    uptime: 3600,
  };

  beforeEach(() => {
    liveGuestsMock.value = new Map();
    vi.mocked(guestsApi.getLxcStatus).mockResolvedValue(MOCK_STATUS);
    vi.mocked(guestsApi.getLxcConfig).mockResolvedValue(MOCK_CONFIG);
  });

  it("CPU gauge uses polled status when no live data is available", async () => {
    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const cpuBar = el.shadowRoot!.querySelector(
      'pxa-usage-bar[label="CPU"]',
    ) as any;
    expect(cpuBar).to.exist;
    expect(cpuBar.fraction).to.equal(MOCK_STATUS.cpu); // 0.1
  });

  it("CPU gauge uses live signal value when SSE data is available", async () => {
    liveGuestsMock.value = new Map([["pve", [MOCK_LIVE_CT]]]);

    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const cpuBar = el.shadowRoot!.querySelector(
      'pxa-usage-bar[label="CPU"]',
    ) as any;
    expect(cpuBar).to.exist;
    expect(cpuBar.fraction).to.equal(0.6);
  });

  it("memory gauge uses live signal value", async () => {
    liveGuestsMock.value = new Map([["pve", [MOCK_LIVE_CT]]]);

    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const memBar = el.shadowRoot!.querySelector(
      'pxa-usage-bar[label="Memory"]',
    ) as any;
    expect(memBar).to.exist;
    // 400 MB / 512 MB
    expect(memBar.fraction).to.be.closeTo(400 / 512, 0.001);
  });

  it("Root FS gauge uses live signal value", async () => {
    liveGuestsMock.value = new Map([["pve", [MOCK_LIVE_CT]]]);

    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const diskBar = el.shadowRoot!.querySelector(
      'pxa-usage-bar[label="Root FS"]',
    ) as any;
    expect(diskBar).to.exist;
    // 2 GB / 8 GB = 0.25
    expect(diskBar.fraction).to.be.closeTo(0.25, 0.001);
  });

  it("gauges update when live signal changes after initial render", async () => {
    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const cpuBar = el.shadowRoot!.querySelector(
      'pxa-usage-bar[label="CPU"]',
    ) as any;
    expect(cpuBar.fraction).to.equal(MOCK_STATUS.cpu); // 0.1 initially

    // Simulate a new SSE push
    liveGuestsMock.value = new Map([["pve", [MOCK_LIVE_CT]]]);
    el.requestUpdate();
    await el.updateComplete;

    expect(cpuBar.fraction).to.equal(0.6);
  });

  it("ignores live data for a different node", async () => {
    liveGuestsMock.value = new Map([["other-node", [MOCK_LIVE_CT]]]);

    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const cpuBar = el.shadowRoot!.querySelector(
      'pxa-usage-bar[label="CPU"]',
    ) as any;
    expect(cpuBar.fraction).to.equal(MOCK_STATUS.cpu);
  });

  it("ignores live data for a different vmid", async () => {
    liveGuestsMock.value = new Map([["pve", [{ ...MOCK_LIVE_CT, vmid: 999 }]]]);

    const el = await fixture<LxcDetailView>(
      html`<pxa-lxc-detail-view node="pve" .vmid=${101}></pxa-lxc-detail-view>`,
    );
    await flushTasks(el);

    const cpuBar = el.shadowRoot!.querySelector(
      'pxa-usage-bar[label="CPU"]',
    ) as any;
    expect(cpuBar.fraction).to.equal(MOCK_STATUS.cpu);
  });
});

import { html, fixture, expect } from "@open-wc/testing";
import { vi, expect as vitestExpect } from "vitest";
import type { LxcConfig } from "@proxmox-admin/types";
import type { LxcResourcesPanel } from "./lxc-resources-panel";

vi.mock("../../app/api.ts", () => ({
  guestsApi: {
    updateLxcConfig: vi.fn().mockResolvedValue(null),
  },
}));

import "./lxc-resources-panel";
import { guestsApi } from "../../app/api.ts";

const MOCK_CONFIG: LxcConfig = {
  vmid: 100,
  node: "pve",
  hostname: "test-container",
  ostype: "debian",
  arch: "amd64",
  unprivileged: true,
  memory: 512,
  swap: 512,
  cores: 2,
  rootfs: "local:100/vm-100-disk-0.raw",
  onboot: false,
};

describe("pxa-lxc-resources-panel", () => {
  it("renders nothing when config is null", async () => {
    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
      ></pxa-lxc-resources-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".panel")).to.be.null;
  });

  it("shows Edit button and no inputs in view mode", async () => {
    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='number']")).to.be.null;
  });

  it("shows Revert and Save after clicking Edit", async () => {
    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-revert")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-save")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.be.null;
  });

  it("shows number inputs in edit mode", async () => {
    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector("input[type='number']")).to.exist;
  });

  it("clicking Revert returns to view mode", async () => {
    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-revert")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='number']")).to.be.null;
  });

  it("calls updateLxcConfig with only changed resource fields on Save", async () => {
    const mockFn = vi.mocked(guestsApi.updateLxcConfig);
    mockFn.mockClear();

    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    // First number input is memory
    const memInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='number']",
    )!;
    memInput.value = "1024";
    memInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    vitestExpect(mockFn).toHaveBeenCalledWith(
      "pve",
      100,
      vitestExpect.objectContaining({ memory: 1024 }),
    );
    // hostname is not a resource field — must not be in payload
    const callArg = mockFn.mock.calls[0][2];
    vitestExpect(callArg).not.toHaveProperty("hostname");
    vitestExpect(callArg).not.toHaveProperty("onboot");
  });

  it("dispatches config-updated on successful save", async () => {
    vi.mocked(guestsApi.updateLxcConfig).mockResolvedValueOnce(null);

    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );

    let fired = false;
    el.addEventListener("config-updated", () => {
      fired = true;
    });

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const memInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='number']",
    )!;
    memInput.value = "2048";
    memInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    expect(fired).to.be.true;
  });

  it("shows error-banner when the API rejects", async () => {
    vi.mocked(guestsApi.updateLxcConfig).mockRejectedValueOnce(
      new Error("quota exceeded"),
    );

    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const memInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='number']",
    )!;
    memInput.value = "99999";
    memInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".error-banner")).to.exist;
    expect(
      el.shadowRoot!.querySelector(".error-banner")!.textContent,
    ).to.include("quota exceeded");
  });

  it("shows root FS as read-only", async () => {
    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );

    const text = el.shadowRoot!.textContent ?? "";
    expect(text).to.include("read-only");
    expect(text).to.include("local:100/vm-100-disk-0.raw");
  });

  it("displays memory and swap in view mode", async () => {
    const el = await fixture<LxcResourcesPanel>(
      html`<pxa-lxc-resources-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-resources-panel>`,
    );

    const text = el.shadowRoot!.textContent ?? "";
    // 512 MiB displayed in some format
    expect(text).to.include("512");
  });
});

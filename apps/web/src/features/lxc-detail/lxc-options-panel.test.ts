import { html, fixture, expect } from "@open-wc/testing";
import { vi, expect as vitestExpect } from "vitest";
import type { LxcConfig } from "@proxmox-admin/types";
import type { LxcOptionsPanel } from "./lxc-options-panel";

vi.mock("../../app/api.ts", () => ({
  guestsApi: {
    updateLxcConfig: vi.fn().mockResolvedValue(null),
  },
}));

import "./lxc-options-panel";
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
  protection: false,
  console: true,
  tty: 2,
  cmode: "tty",
};

describe("pxa-lxc-options-panel", () => {
  it("renders nothing when config is null", async () => {
    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
      ></pxa-lxc-options-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".panel")).to.be.null;
  });

  it("shows Edit button and no inputs when not editing", async () => {
    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='text']")).to.be.null;
    expect(el.shadowRoot!.querySelector("input[type='checkbox']")).to.be.null;
  });

  it("shows Revert and Save buttons after clicking Edit", async () => {
    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-revert")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-save")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.be.null;
  });

  it("shows text inputs in edit mode", async () => {
    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector("input[type='text']")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='checkbox']")).to.exist;
  });

  it("clicking Revert returns to view mode with no inputs", async () => {
    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-revert")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='text']")).to.be.null;
  });

  it("calls updateLxcConfig with only changed fields on Save", async () => {
    const mockFn = vi.mocked(guestsApi.updateLxcConfig);
    mockFn.mockClear();

    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    // The first text input is the Hostname field
    const hostnameInput =
      el.shadowRoot!.querySelector<HTMLInputElement>("input[type='text']")!;
    hostnameInput.value = "renamed-container";
    hostnameInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    vitestExpect(mockFn).toHaveBeenCalledWith(
      "pve",
      100,
      vitestExpect.objectContaining({ hostname: "renamed-container" }),
    );
    // Must NOT include unchanged fields
    const callArg = mockFn.mock.calls[0][2];
    vitestExpect(callArg).not.toHaveProperty("memory");
    vitestExpect(callArg).not.toHaveProperty("cores");
  });

  it("dispatches config-updated event on successful save", async () => {
    vi.mocked(guestsApi.updateLxcConfig).mockResolvedValueOnce(null);

    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );

    let fired = false;
    el.addEventListener("config-updated", () => {
      fired = true;
    });

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const hostnameInput =
      el.shadowRoot!.querySelector<HTMLInputElement>("input[type='text']")!;
    hostnameInput.value = "new-ct";
    hostnameInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    expect(fired).to.be.true;
  });

  it("shows error-banner when the API rejects", async () => {
    vi.mocked(guestsApi.updateLxcConfig).mockRejectedValueOnce(
      new Error("permission denied"),
    );

    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const hostnameInput =
      el.shadowRoot!.querySelector<HTMLInputElement>("input[type='text']")!;
    hostnameInput.value = "x";
    hostnameInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".error-banner")).to.exist;
    expect(
      el.shadowRoot!.querySelector(".error-banner")!.textContent,
    ).to.include("permission denied");
  });

  it("displays Yes/No for boolean fields in view mode", async () => {
    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${{ ...MOCK_CONFIG, onboot: true, protection: false }}
      ></pxa-lxc-options-panel>`,
    );

    const text = el.shadowRoot!.textContent ?? "";
    expect(text).to.include("Yes");
    expect(text).to.include("No");
  });

  it("shows unprivileged as read-only", async () => {
    const el = await fixture<LxcOptionsPanel>(
      html`<pxa-lxc-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-lxc-options-panel>`,
    );

    const text = el.shadowRoot!.textContent ?? "";
    expect(text).to.include("read-only");
  });
});

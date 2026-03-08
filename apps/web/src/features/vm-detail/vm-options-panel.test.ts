import { html, fixture, expect } from "@open-wc/testing";
import { vi, expect as vitestExpect } from "vitest";
import type { QemuConfig } from "@proxmox-admin/types";
import type { VmOptionsPanel } from "./vm-options-panel";

vi.mock("../../app/api.ts", () => ({
  guestsApi: {
    updateQemuConfig: vi.fn().mockResolvedValue(null),
  },
}));

import "./vm-options-panel";
import { guestsApi } from "../../app/api.ts";

const MOCK_CONFIG: QemuConfig = {
  vmid: 100,
  node: "pve",
  name: "test-vm",
  memory: 2048,
  cores: 2,
  sockets: 1,
  ostype: "l26",
  bios: "seabios",
  machine: "pc",
  boot: "order=scsi0",
  onboot: true,
  cpu: "host",
};

describe("pxa-vm-options-panel", () => {
  it("renders nothing when config is null", async () => {
    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel node="pve" .vmid=${100}></pxa-vm-options-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".panel")).to.be.null;
  });

  it("shows Edit button and no text inputs when not editing", async () => {
    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-options-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='text']")).to.be.null;
    expect(el.shadowRoot!.querySelector("input[type='checkbox']")).to.be.null;
  });

  it("shows Revert and Save buttons after clicking Edit", async () => {
    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-options-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-revert")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-save")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.be.null;
  });

  it("shows text inputs in edit mode", async () => {
    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-options-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector("input[type='text']")).to.exist;
  });

  it("clicking Revert returns to view mode with no inputs", async () => {
    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-options-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-revert")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='text']")).to.be.null;
  });

  it("calls updateQemuConfig with only changed fields on Save", async () => {
    const mockFn = vi.mocked(guestsApi.updateQemuConfig);
    mockFn.mockClear();

    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-options-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    // The first text input in edit mode is the Name field
    const nameInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='text']",
    )!;
    nameInput.value = "renamed-vm";
    nameInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    // Flush the async save
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    vitestExpect(mockFn).toHaveBeenCalledWith(
      "pve",
      100,
      vitestExpect.objectContaining({ name: "renamed-vm" }),
    );
    // Must NOT include fields that were not changed
    const callArg = mockFn.mock.calls[0][2];
    vitestExpect(callArg).not.toHaveProperty("memory");
    vitestExpect(callArg).not.toHaveProperty("cores");
  });

  it("dispatches config-updated event on successful save", async () => {
    vi.mocked(guestsApi.updateQemuConfig).mockResolvedValueOnce(null);

    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-options-panel>`,
    );

    let fired = false;
    el.addEventListener("config-updated", () => {
      fired = true;
    });

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const nameInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='text']",
    )!;
    nameInput.value = "new-name";
    nameInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    expect(fired).to.be.true;
  });

  it("shows error-banner when the API rejects", async () => {
    vi.mocked(guestsApi.updateQemuConfig).mockRejectedValueOnce(
      new Error("permission denied"),
    );

    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-options-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const nameInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='text']",
    )!;
    nameInput.value = "x";
    nameInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    const errorBanner = el.shadowRoot!.querySelector(".error-banner");
    expect(errorBanner).to.exist;
    expect(errorBanner!.textContent).to.include("permission denied");
  });

  it("displays onboot as Yes when true", async () => {
    const cfg = { ...MOCK_CONFIG, onboot: true };
    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${cfg}
      ></pxa-vm-options-panel>`,
    );
    expect(el.shadowRoot!.textContent).to.include("Yes");
  });

  it("displays onboot as No when false", async () => {
    const cfg = { ...MOCK_CONFIG, onboot: false };
    const el = await fixture<VmOptionsPanel>(
      html`<pxa-vm-options-panel
        node="pve"
        .vmid=${100}
        .config=${cfg}
      ></pxa-vm-options-panel>`,
    );
    const rows = el.shadowRoot!.querySelectorAll(".option-row");
    // The "Start at boot" row should show No
    const bootRow = Array.from(rows).find((r) =>
      r.textContent?.includes("Start at boot"),
    );
    expect(bootRow!.textContent).to.include("No");
  });
});

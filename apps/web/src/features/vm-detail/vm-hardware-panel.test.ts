import { html, fixture, expect } from "@open-wc/testing";
import { vi, expect as vitestExpect } from "vitest";
import type { QemuConfig } from "@proxmox-admin/types";
import type { VmHardwarePanel } from "./vm-hardware-panel";

vi.mock("../../app/api.ts", () => ({
  guestsApi: {
    updateQemuConfig: vi.fn().mockResolvedValue(null),
  },
}));

import "./vm-hardware-panel";
import { guestsApi } from "../../app/api.ts";

const MOCK_CONFIG: QemuConfig = {
  vmid: 100,
  node: "pve",
  name: "test-vm",
  memory: 2048,
  cores: 2,
  sockets: 1,
  cpu: "host",
  ostype: "l26",
  bios: "seabios",
  machine: "pc",
  boot: "order=scsi0",
  onboot: true,
  scsihw: "virtio-scsi-pci",
  scsi0: "local-lvm:vm-100-disk-0,size=32G",
  net0: "virtio=AA:BB:CC:DD:EE:FF,bridge=vmbr0",
};

describe("pxa-vm-hardware-panel", () => {
  it("renders nothing when config is null", async () => {
    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
      ></pxa-vm-hardware-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".panel")).to.be.null;
  });

  it("shows Edit button and no number inputs when not editing", async () => {
    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='number']")).to.be.null;
  });

  it("shows Revert and Save buttons after clicking Edit", async () => {
    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-revert")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-save")).to.exist;
    expect(el.shadowRoot!.querySelector(".btn-edit")).to.be.null;
  });

  it("shows number inputs for memory and processor fields in edit mode", async () => {
    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const numberInputs = el.shadowRoot!.querySelectorAll("input[type='number']");
    expect(numberInputs.length).to.be.greaterThan(0);
  });

  it("clicking Revert returns to view mode with no number inputs", async () => {
    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );
    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-revert")!.click();
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector(".btn-edit")).to.exist;
    expect(el.shadowRoot!.querySelector("input[type='number']")).to.be.null;
  });

  it("calls updateQemuConfig with changed memory on Save", async () => {
    const mockFn = vi.mocked(guestsApi.updateQemuConfig);
    mockFn.mockClear();

    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    // The first number input is the Memory (MiB) field
    const memInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='number']",
    )!;
    memInput.value = "4096";
    memInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    vitestExpect(mockFn).toHaveBeenCalledWith(
      "pve",
      100,
      vitestExpect.objectContaining({ memory: 4096 }),
    );
  });

  it("dispatches config-updated event on successful save", async () => {
    vi.mocked(guestsApi.updateQemuConfig).mockResolvedValueOnce(null);

    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
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
    memInput.value = "8192";
    memInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    expect(fired).to.be.true;
  });

  it("shows error-banner when the API rejects", async () => {
    vi.mocked(guestsApi.updateQemuConfig).mockRejectedValueOnce(
      new Error("VM is locked"),
    );

    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );

    el.shadowRoot!.querySelector<HTMLElement>(".btn-edit")!.click();
    await el.updateComplete;

    const memInput = el.shadowRoot!.querySelector<HTMLInputElement>(
      "input[type='number']",
    )!;
    memInput.value = "16384";
    memInput.dispatchEvent(new Event("input"));
    await el.updateComplete;

    el.shadowRoot!.querySelector<HTMLElement>(".btn-save")!.click();
    await Promise.resolve();
    await Promise.resolve();
    await el.updateComplete;

    const errorBanner = el.shadowRoot!.querySelector(".error-banner");
    expect(errorBanner).to.exist;
    expect(errorBanner!.textContent).to.include("VM is locked");
  });

  it("renders the Core Resources section divider", async () => {
    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );
    const dividers = el.shadowRoot!.querySelectorAll(".section-divider");
    expect(dividers.length).to.be.greaterThan(0);
    const labels = Array.from(dividers).map((d) => d.textContent?.trim());
    expect(labels).to.include("Core Resources");
  });

  it("renders disk entries from the config", async () => {
    const el = await fixture<VmHardwarePanel>(
      html`<pxa-vm-hardware-panel
        node="pve"
        .vmid=${100}
        .config=${MOCK_CONFIG}
      ></pxa-vm-hardware-panel>`,
    );
    // scsi0 from MOCK_CONFIG should appear in the rendered output
    expect(el.shadowRoot!.textContent).to.include("scsi0");
  });
});

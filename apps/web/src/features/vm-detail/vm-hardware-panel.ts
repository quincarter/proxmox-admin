import { LitElement, html, nothing, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { guestsApi } from "../../app/api.ts";
import type { QemuConfig, QemuConfigUpdate } from "@proxmox-admin/types";
import { VmHardwarePanelStyles } from "./vm-hardware-panel.styles.ts";

const DISK_PREFIXES = ["scsi", "virtio", "ide", "sata", "sas"];
const NET_PREFIX = "net";
const USB_PREFIX = "usb";
const EFI_KEY = "efidisk0";

function isDiskKey(key: string): boolean {
  return (
    DISK_PREFIXES.some((p) => key.startsWith(p) && /\d$/.test(key)) &&
    key !== EFI_KEY
  );
}
function isNetKey(key: string): boolean {
  return key.startsWith(NET_PREFIX) && /\d$/.test(key);
}
function isUsbKey(key: string): boolean {
  return key.startsWith(USB_PREFIX) && /\d$/.test(key);
}

const BIOS_OPTIONS: Array<[string, string]> = [
  ["seabios", "SeaBIOS"],
  ["ovmf", "OVMF (UEFI)"],
];

const CPU_TYPES: Array<[string, string]> = [
  ["host", "host"],
  ["kvm64", "kvm64"],
  ["kvm32", "kvm32"],
  ["x86-64-v2-AES", "x86-64-v2-AES"],
  ["x86-64-v2", "x86-64-v2"],
  ["x86-64-v3", "x86-64-v3"],
  ["x86-64-v4", "x86-64-v4"],
  ["max", "max"],
  ["Skylake-Client", "Skylake-Client"],
  ["Broadwell", "Broadwell"],
];

const SCSI_CONTROLLERS: Array<[string, string]> = [
  ["lsi", "LSI 53C895A"],
  ["lsi53c810", "LSI 53C810"],
  ["megasas", "MegaRAID SAS 8708EM2"],
  ["pvscsi", "VMware PVSCSI"],
  ["virtio-scsi-pci", "VirtIO SCSI"],
  ["virtio-scsi-single", "VirtIO SCSI Single"],
  ["hvscsi", "Hyper-V SCSI"],
];

@customElement("pxa-vm-hardware-panel")
export class VmHardwarePanel extends LitElement {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @property({ attribute: false }) config: QemuConfig | null = null;

  @state() private _editing = false;
  @state() private _saving = false;
  @state() private _error = "";
  @state() private _draft: QemuConfigUpdate = {};

  static styles: CSSResultOrNative[] = [VmHardwarePanelStyles];

  private _fmtMb(mb: number): string {
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GiB` : `${mb} MiB`;
  }

  private _startEdit() {
    if (!this.config) return;
    const c = this.config;
    this._draft = {
      memory: c.memory,
      balloon: c.balloon,
      cores: c.cores ?? 1,
      sockets: c.sockets ?? 1,
      cpu: c.cpu ?? "host",
      bios: c.bios ?? "seabios",
      machine: c.machine ?? "",
      vga: c.vga ?? "",
      scsihw: c.scsihw ?? "virtio-scsi-pci",
    };
    this._error = "";
    this._editing = true;
  }

  private _cancelEdit() {
    this._editing = false;
    this._draft = {};
    this._error = "";
  }

  private async _saveEdit() {
    const changed: QemuConfigUpdate = {};
    const c = this.config!;
    const d = this._draft;

    if (d.memory !== undefined && d.memory !== c.memory)
      changed.memory = d.memory;
    if (d.balloon !== undefined && d.balloon !== c.balloon)
      changed.balloon = d.balloon;
    if (d.cores !== undefined && d.cores !== (c.cores ?? 1))
      changed.cores = d.cores;
    if (d.sockets !== undefined && d.sockets !== (c.sockets ?? 1))
      changed.sockets = d.sockets;
    if (d.cpu !== undefined && d.cpu !== (c.cpu ?? "host")) changed.cpu = d.cpu;
    if (d.bios !== undefined && d.bios !== (c.bios ?? "seabios"))
      changed.bios = d.bios;
    if (d.machine !== undefined && d.machine !== (c.machine ?? ""))
      changed.machine = d.machine;
    if (d.vga !== undefined && d.vga !== (c.vga ?? "")) changed.vga = d.vga;
    if (d.scsihw !== undefined && d.scsihw !== (c.scsihw ?? "virtio-scsi-pci"))
      changed.scsihw = d.scsihw;

    if (Object.keys(changed).length === 0) {
      this._editing = false;
      return;
    }

    this._saving = true;
    this._error = "";
    try {
      await guestsApi.updateQemuConfig(this.node, this.vmid, changed);
      this._editing = false;
      this.dispatchEvent(
        new CustomEvent("config-updated", { bubbles: true, composed: true }),
      );
    } catch (e) {
      this._error = e instanceof Error ? e.message : "Save failed";
    } finally {
      this._saving = false;
    }
  }

  private _setNum(key: keyof QemuConfigUpdate, value: string) {
    const n = parseInt(value, 10);
    if (!isNaN(n)) this._draft = { ...this._draft, [key]: n };
  }

  private _setStr(key: keyof QemuConfigUpdate, value: string) {
    this._draft = { ...this._draft, [key]: value };
  }

  private _numVal(key: keyof QemuConfigUpdate, fallback: number): number {
    const v = this._draft[key];
    return typeof v === "number" ? v : fallback;
  }

  private _strVal(key: keyof QemuConfigUpdate, fallback = ""): string {
    const v = this._draft[key];
    return v !== undefined ? String(v) : fallback;
  }

  render() {
    const cfg = this.config;
    if (!cfg) return nothing;

    const disks = Object.entries(cfg).filter(
      ([k, v]) => isDiskKey(k) && typeof v === "string",
    ) as [string, string][];
    const nets = Object.entries(cfg).filter(
      ([k, v]) => isNetKey(k) && typeof v === "string",
    ) as [string, string][];
    const usbs = Object.entries(cfg).filter(
      ([k, v]) => isUsbKey(k) && typeof v === "string",
    ) as [string, string][];
    const efiDisk = cfg[EFI_KEY] as string | undefined;

    const cpuLabel = `${cfg.cores ?? 1} (${cfg.sockets ?? 1} socket${(cfg.sockets ?? 1) > 1 ? "s" : ""}, ${cfg.cores ?? 1} core${(cfg.cores ?? 1) > 1 ? "s" : ""}) [${cfg.cpu ?? "host"}]`;

    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Hardware</span>
          <div class="header-actions">
            ${this._saving
              ? html`<span class="saving-overlay"
                  ><span class="spinner"></span>Saving…</span
                >`
              : this._editing
                ? html`
                    <button class="btn btn-revert" @click=${this._cancelEdit}>
                      Revert
                    </button>
                    <button class="btn btn-save" @click=${this._saveEdit}>
                      Save
                    </button>
                  `
                : html`<button class="btn btn-edit" @click=${this._startEdit}>
                    Edit
                  </button>`}
          </div>
        </div>

        <div class="section-divider">Core Resources</div>

        <!-- Memory -->
        <div class="hw-row">
          <div class="hw-icon-label"><span class="hw-icon">🖥️</span>Memory</div>
          <div class="hw-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <div class="edit-row">
                    <div class="edit-field">
                      <span class="edit-label">Memory (MiB)</span>
                      <input
                        type="number"
                        min="16"
                        step="256"
                        .value=${String(this._numVal("memory", cfg.memory))}
                        @input=${(e: Event) =>
                          this._setNum(
                            "memory",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                    <div class="edit-field">
                      <span class="edit-label">Min balloon (MiB)</span>
                      <input
                        type="number"
                        min="0"
                        step="256"
                        .value=${String(
                          this._numVal("balloon", cfg.balloon ?? 0),
                        )}
                        @input=${(e: Event) =>
                          this._setNum(
                            "balloon",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                  </div>
                `
              : html`${this._fmtMb(cfg.memory)}${cfg.balloon
                  ? ` (min ${this._fmtMb(cfg.balloon)})`
                  : ""}`}
          </div>
        </div>

        <!-- Processors -->
        <div class="hw-row">
          <div class="hw-icon-label">
            <span class="hw-icon">⚙️</span>Processors
          </div>
          <div class="hw-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <div class="edit-row">
                    <div class="edit-field">
                      <span class="edit-label">Sockets</span>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        .value=${String(
                          this._numVal("sockets", cfg.sockets ?? 1),
                        )}
                        @input=${(e: Event) =>
                          this._setNum(
                            "sockets",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                    <div class="edit-field">
                      <span class="edit-label">Cores</span>
                      <input
                        type="number"
                        min="1"
                        max="256"
                        .value=${String(this._numVal("cores", cfg.cores ?? 1))}
                        @input=${(e: Event) =>
                          this._setNum(
                            "cores",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                    <div class="edit-field">
                      <span class="edit-label">CPU Type</span>
                      <select
                        .value=${this._strVal("cpu", cfg.cpu ?? "host")}
                        @change=${(e: Event) =>
                          this._setStr(
                            "cpu",
                            (e.target as HTMLSelectElement).value,
                          )}
                      >
                        ${CPU_TYPES.map(
                          ([val, label]) => html`
                            <option
                              value=${val}
                              ?selected=${this._strVal(
                                "cpu",
                                cfg.cpu ?? "host",
                              ) === val}
                            >
                              ${label}
                            </option>
                          `,
                        )}
                      </select>
                    </div>
                  </div>
                `
              : html`${cpuLabel}`}
          </div>
        </div>

        <!-- BIOS -->
        <div class="hw-row">
          <div class="hw-icon-label"><span class="hw-icon">💾</span>BIOS</div>
          <div class="hw-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <select
                    .value=${this._strVal("bios", cfg.bios ?? "seabios")}
                    @change=${(e: Event) =>
                      this._setStr(
                        "bios",
                        (e.target as HTMLSelectElement).value,
                      )}
                  >
                    ${BIOS_OPTIONS.map(
                      ([val, label]) => html`
                        <option
                          value=${val}
                          ?selected=${this._strVal(
                            "bios",
                            cfg.bios ?? "seabios",
                          ) === val}
                        >
                          ${label}
                        </option>
                      `,
                    )}
                  </select>
                `
              : html`${BIOS_OPTIONS.find(([v]) => v === cfg.bios)?.[1] ??
                cfg.bios ??
                "SeaBIOS"}`}
          </div>
        </div>

        <!-- Display -->
        <div class="hw-row">
          <div class="hw-icon-label">
            <span class="hw-icon">🖥️</span>Display
          </div>
          <div class="hw-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <input
                    type="text"
                    placeholder="Default (std)"
                    .value=${this._strVal("vga", cfg.vga ?? "")}
                    @input=${(e: Event) =>
                      this._setStr("vga", (e.target as HTMLInputElement).value)}
                  />
                `
              : html`${cfg.vga ?? "Default"}`}
          </div>
        </div>

        <!-- Machine -->
        <div class="hw-row">
          <div class="hw-icon-label">
            <span class="hw-icon">🔧</span>Machine
          </div>
          <div class="hw-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <input
                    type="text"
                    placeholder="Default (i440fx)"
                    .value=${this._strVal("machine", cfg.machine ?? "")}
                    @input=${(e: Event) =>
                      this._setStr(
                        "machine",
                        (e.target as HTMLInputElement).value,
                      )}
                  />
                `
              : html`${cfg.machine
                  ? `Default (${cfg.machine})`
                  : "Default (i440fx)"}`}
          </div>
        </div>

        <!-- SCSI Controller -->
        <div class="hw-row">
          <div class="hw-icon-label">
            <span class="hw-icon">🗄️</span>SCSI Controller
          </div>
          <div class="hw-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <select
                    .value=${this._strVal(
                      "scsihw",
                      cfg.scsihw ?? "virtio-scsi-pci",
                    )}
                    @change=${(e: Event) =>
                      this._setStr(
                        "scsihw",
                        (e.target as HTMLSelectElement).value,
                      )}
                  >
                    ${SCSI_CONTROLLERS.map(
                      ([val, label]) => html`
                        <option
                          value=${val}
                          ?selected=${this._strVal(
                            "scsihw",
                            cfg.scsihw ?? "virtio-scsi-pci",
                          ) === val}
                        >
                          ${label}
                        </option>
                      `,
                    )}
                  </select>
                `
              : html`${SCSI_CONTROLLERS.find(([v]) => v === cfg.scsihw)?.[1] ??
                cfg.scsihw ??
                "VirtIO SCSI"}`}
          </div>
        </div>

        ${disks.length > 0
          ? html`
              <div class="section-divider">Disks</div>
              ${disks.map(
                ([key, val]) => html`
                  <div class="hw-row">
                    <div class="hw-icon-label">
                      <span class="hw-icon">💿</span>Hard Disk (${key})
                    </div>
                    <div class="hw-value">${val}</div>
                  </div>
                `,
              )}
            `
          : nothing}
        ${efiDisk
          ? html`
              <div class="hw-row">
                <div class="hw-icon-label">
                  <span class="hw-icon">💿</span>EFI Disk
                </div>
                <div class="hw-value">${efiDisk}</div>
              </div>
            `
          : nothing}
        ${nets.length > 0
          ? html`
              <div class="section-divider">Network</div>
              ${nets.map(
                ([key, val]) => html`
                  <div class="hw-row">
                    <div class="hw-icon-label">
                      <span class="hw-icon">🌐</span>Network Device (${key})
                    </div>
                    <div class="hw-value">${val}</div>
                  </div>
                `,
              )}
            `
          : nothing}
        ${usbs.length > 0
          ? html`
              <div class="section-divider">USB</div>
              ${usbs.map(
                ([key, val]) => html`
                  <div class="hw-row">
                    <div class="hw-icon-label">
                      <span class="hw-icon">🔌</span>USB Device (${key})
                    </div>
                    <div class="hw-value">${val}</div>
                  </div>
                `,
              )}
            `
          : nothing}
        ${this._error
          ? html`<div class="error-banner">${this._error}</div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-vm-hardware-panel": VmHardwarePanel;
  }
}

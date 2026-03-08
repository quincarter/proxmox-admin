import { LitElement, html, nothing, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { guestsApi } from "../../app/api.ts";
import type { QemuConfig, QemuConfigUpdate } from "@proxmox-admin/types";
import { VmOptionsPanelStyles } from "./vm-options-panel.styles.ts";

const OS_TYPES: Array<[string, string]> = [
  ["other", "Other"],
  ["l24", "Linux 2.4"],
  ["l26", "Linux 6.x / 2.6"],
  ["win11", "Windows 11 / 2022 / 2025"],
  ["win10", "Windows 10 / 2016 / 2019"],
  ["win81", "Windows 8.1 / 2012 R2"],
  ["win8", "Windows 8 / 2012"],
  ["win7", "Windows 7"],
  ["wvista", "Windows Vista"],
  ["w2k8", "Windows 2008"],
  ["w2k3", "Windows 2003"],
  ["w2k", "Windows 2000"],
  ["wxp", "Windows XP"],
  ["solaris", "Solaris Kernel"],
];

@customElement("pxa-vm-options-panel")
export class VmOptionsPanel extends LitElement {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @property({ attribute: false }) config: QemuConfig | null = null;

  @state() private _editing = false;
  @state() private _saving = false;
  @state() private _error = "";
  @state() private _draft: QemuConfigUpdate = {};

  static styles: CSSResultOrNative[] = [VmOptionsPanelStyles];

  private _startEdit() {
    if (!this.config) return;
    const c = this.config;
    this._draft = {
      name: c.name ?? "",
      onboot: c.onboot ?? false,
      startup: c.startup ?? "",
      ostype: c.ostype ?? "other",
      boot: c.boot ?? "",
      tablet: c.tablet ?? false,
      hotplug: c.hotplug ?? "disk,network,usb",
      acpi: c.acpi ?? true,
      kvm: c.kvm ?? true,
      freeze: c.freeze ?? false,
      localtime: c.localtime ?? false,
      rtcbase: c.rtcbase ?? "now",
      smbios1: c.smbios1 ?? "",
      agent: c.agent ?? "0",
      protection: c.protection ?? false,
      spice_enhancements: c.spice_enhancements ?? "",
      vmstatestorage: c.vmstatestorage ?? "automatic",
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
    // Only send fields that actually changed
    const changed: QemuConfigUpdate = {};
    const c = this.config!;
    const d = this._draft;
    if (d.name !== undefined && d.name !== (c.name ?? ""))
      changed.name = d.name;
    if (d.onboot !== undefined && d.onboot !== (c.onboot ?? false))
      changed.onboot = d.onboot;
    if (d.startup !== undefined && d.startup !== (c.startup ?? ""))
      changed.startup = d.startup;
    if (d.ostype !== undefined && d.ostype !== (c.ostype ?? "other"))
      changed.ostype = d.ostype;
    if (d.boot !== undefined && d.boot !== (c.boot ?? ""))
      changed.boot = d.boot;
    if (d.tablet !== undefined && d.tablet !== (c.tablet ?? false))
      changed.tablet = d.tablet;
    if (
      d.hotplug !== undefined &&
      d.hotplug !== (c.hotplug ?? "disk,network,usb")
    )
      changed.hotplug = d.hotplug;
    if (d.acpi !== undefined && d.acpi !== (c.acpi ?? true))
      changed.acpi = d.acpi;
    if (d.kvm !== undefined && d.kvm !== (c.kvm ?? true)) changed.kvm = d.kvm;
    if (d.freeze !== undefined && d.freeze !== (c.freeze ?? false))
      changed.freeze = d.freeze;
    if (d.localtime !== undefined && d.localtime !== (c.localtime ?? false))
      changed.localtime = d.localtime;
    if (d.rtcbase !== undefined && d.rtcbase !== (c.rtcbase ?? "now"))
      changed.rtcbase = d.rtcbase;
    if (d.smbios1 !== undefined && d.smbios1 !== (c.smbios1 ?? ""))
      changed.smbios1 = d.smbios1;
    if (d.agent !== undefined && d.agent !== (c.agent ?? "0"))
      changed.agent = d.agent;
    if (d.protection !== undefined && d.protection !== (c.protection ?? false))
      changed.protection = d.protection;
    if (
      d.spice_enhancements !== undefined &&
      d.spice_enhancements !== (c.spice_enhancements ?? "")
    )
      changed.spice_enhancements = d.spice_enhancements;
    if (
      d.vmstatestorage !== undefined &&
      d.vmstatestorage !== (c.vmstatestorage ?? "automatic")
    )
      changed.vmstatestorage = d.vmstatestorage;

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

  private _set<K extends keyof QemuConfigUpdate>(
    key: K,
    value: QemuConfigUpdate[K],
  ) {
    this._draft = { ...this._draft, [key]: value };
  }

  private _boolVal(key: keyof QemuConfigUpdate, defaultVal = false): boolean {
    const v = this._draft[key];
    return v !== undefined ? Boolean(v) : defaultVal;
  }

  private _strVal(key: keyof QemuConfigUpdate, defaultVal = ""): string {
    const v = this._draft[key];
    return v !== undefined ? String(v) : defaultVal;
  }

  private _renderBoolRow(
    label: string,
    key: keyof QemuConfigUpdate,
    defaultVal = false,
  ) {
    if (!this._editing) {
      const val = this.config
        ? (this.config[key as string] ?? defaultVal)
        : defaultVal;
      return html`
        <div class="option-row">
          <span class="option-label">${label}</span>
          <span class="option-value ${val ? "badge-yes" : "badge-no"}"
            >${val ? "Yes" : "No"}</span
          >
        </div>
      `;
    }
    return html`
      <div class="option-row">
        <span class="option-label">${label}</span>
        <span class="option-value edit">
          <div class="toggle-row">
            <input
              type="checkbox"
              .checked=${this._boolVal(key, defaultVal)}
              @change=${(e: Event) =>
                this._set(key, (e.target as HTMLInputElement).checked)}
            />
            <span>${this._boolVal(key, defaultVal) ? "Yes" : "No"}</span>
          </div>
        </span>
      </div>
    `;
  }

  private _renderTextRow(
    label: string,
    key: keyof QemuConfigUpdate,
    placeholder = "",
  ) {
    const cfgVal = this.config ? String(this.config[key as string] ?? "") : "";
    if (!this._editing) {
      return html`
        <div class="option-row">
          <span class="option-label">${label}</span>
          <span class="option-value">${cfgVal || "—"}</span>
        </div>
      `;
    }
    return html`
      <div class="option-row">
        <span class="option-label">${label}</span>
        <span class="option-value edit">
          <input
            type="text"
            .value=${this._strVal(key)}
            placeholder=${placeholder}
            @input=${(e: Event) =>
              this._set(key, (e.target as HTMLInputElement).value)}
          />
        </span>
      </div>
    `;
  }

  render() {
    const cfg = this.config;
    if (!cfg) return nothing;

    const agentEnabled = cfg.agent ? cfg.agent !== "0" : false;

    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Options</span>
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

        <div class="option-table">
          <!-- Name -->
          ${this._editing
            ? html`
                <div class="option-row">
                  <span class="option-label">Name</span>
                  <span class="option-value edit">
                    <input
                      type="text"
                      .value=${this._strVal("name", cfg.name ?? "")}
                      placeholder="vm-name"
                      @input=${(e: Event) =>
                        this._set("name", (e.target as HTMLInputElement).value)}
                    />
                  </span>
                </div>
              `
            : html`
                <div class="option-row">
                  <span class="option-label">Name</span>
                  <span class="option-value">${cfg.name ?? "—"}</span>
                </div>
              `}

          <!-- Start at boot -->
          ${this._renderBoolRow("Start at boot", "onboot")}

          <!-- Start/Shutdown order -->
          ${this._renderTextRow("Start/Shutdown order", "startup", "order=any")}

          <!-- OS Type -->
          <div class="option-row">
            <span class="option-label">OS Type</span>
            <span class="option-value ${this._editing ? "edit" : ""}">
              ${this._editing
                ? html`
                    <select
                      .value=${this._strVal("ostype", cfg.ostype ?? "other")}
                      @change=${(e: Event) =>
                        this._set(
                          "ostype",
                          (e.target as HTMLSelectElement).value,
                        )}
                    >
                      ${OS_TYPES.map(
                        ([val, label]) => html`
                          <option
                            value=${val}
                            ?selected=${this._strVal(
                              "ostype",
                              cfg.ostype ?? "other",
                            ) === val}
                          >
                            ${label}
                          </option>
                        `,
                      )}
                    </select>
                  `
                : html`${OS_TYPES.find(([v]) => v === cfg.ostype)?.[1] ??
                  cfg.ostype ??
                  "—"}`}
            </span>
          </div>

          <!-- Boot Order -->
          ${this._renderTextRow("Boot Order", "boot", "order=scsi0;ide2")}

          <!-- Use tablet for pointer -->
          ${this._renderBoolRow("Use tablet for pointer", "tablet")}

          <!-- Hotplug -->
          ${this._renderTextRow("Hotplug", "hotplug", "disk,network,usb")}

          <!-- ACPI support -->
          ${this._renderBoolRow("ACPI support", "acpi", true)}

          <!-- KVM hardware virtualization -->
          ${this._renderBoolRow("KVM hardware virtualization", "kvm", true)}

          <!-- Freeze CPU at startup -->
          ${this._renderBoolRow("Freeze CPU at startup", "freeze")}

          <!-- Use local time for RTC -->
          ${this._renderBoolRow("Use local time for RTC", "localtime")}

          <!-- RTC start date -->
          ${this._renderTextRow("RTC start date", "rtcbase", "now")}

          <!-- SMBIOS settings -->
          ${this._renderTextRow(
            "SMBIOS settings (type1)",
            "smbios1",
            "uuid=...",
          )}

          <!-- QEMU Guest Agent -->
          <div class="option-row">
            <span class="option-label">QEMU Guest Agent</span>
            <span class="option-value ${this._editing ? "edit" : ""}">
              ${this._editing
                ? html`
                    <select
                      .value=${this._strVal("agent", cfg.agent ?? "0")}
                      @change=${(e: Event) =>
                        this._set(
                          "agent",
                          (e.target as HTMLSelectElement).value,
                        )}
                    >
                      <option value="0" ?selected=${!agentEnabled}>
                        Disabled
                      </option>
                      <option value="1" ?selected=${agentEnabled}>
                        Enabled
                      </option>
                    </select>
                  `
                : html`<span class="${agentEnabled ? "badge-yes" : "badge-no"}"
                    >${agentEnabled ? "Enabled" : "Disabled"}</span
                  >`}
            </span>
          </div>

          <!-- Protection -->
          ${this._renderBoolRow("Protection", "protection")}

          <!-- Spice Enhancements -->
          ${this._renderTextRow(
            "Spice Enhancements",
            "spice_enhancements",
            "none",
          )}

          <!-- VM State storage -->
          ${this._renderTextRow(
            "VM State storage",
            "vmstatestorage",
            "Automatic",
          )}
        </div>

        ${this._error
          ? html`<div class="error-banner">${this._error}</div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-vm-options-panel": VmOptionsPanel;
  }
}

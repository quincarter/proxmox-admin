import { LitElement, html, nothing, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { guestsApi } from "../../app/api.ts";
import type { LxcConfig, LxcConfigUpdate } from "@proxmox-admin/types";
import { LxcOptionsPanelStyles } from "./lxc-options-panel.styles.ts";

const LXC_ARCH_OPTIONS: Array<[string, string]> = [
  ["amd64", "amd64 (x86_64)"],
  ["i386", "i386 (x86)"],
  ["arm64", "arm64 (AArch64)"],
  ["armhf", "armhf (ARM)"],
  ["riscv32", "riscv32"],
  ["riscv64", "riscv64"],
];

const LXC_CMODE_OPTIONS: Array<[string, string]> = [
  ["tty", "tty"],
  ["console", "console"],
  ["shell", "shell"],
];

const LXC_OS_TYPES: Array<[string, string]> = [
  ["debian", "Debian"],
  ["devuan", "Devuan"],
  ["ubuntu", "Ubuntu"],
  ["centos", "CentOS"],
  ["fedora", "Fedora"],
  ["opensuse", "openSUSE"],
  ["archlinux", "Arch Linux"],
  ["alpine", "Alpine"],
  ["gentoo", "Gentoo"],
  ["nixos", "NixOS"],
  ["unmanaged", "Unmanaged"],
];

@customElement("pxa-lxc-options-panel")
export class LxcOptionsPanel extends LitElement {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @property({ attribute: false }) config: LxcConfig | null = null;

  @state() private _editing = false;
  @state() private _saving = false;
  @state() private _error = "";
  @state() private _draft: LxcConfigUpdate = {};

  static styles: CSSResultOrNative[] = [LxcOptionsPanelStyles];

  private _startEdit() {
    if (!this.config) return;
    const c = this.config;
    this._draft = {
      hostname: c.hostname ?? "",
      onboot: c.onboot ?? false,
      startup: c.startup ?? "",
      ostype: c.ostype ?? "unmanaged",
      arch: c.arch ?? "amd64",
      console: c.console ?? true,
      tty: c.tty ?? 2,
      cmode: c.cmode ?? "tty",
      protection: c.protection ?? false,
      features: c.features ?? "",
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
    const changed: LxcConfigUpdate = {};
    const c = this.config!;
    const d = this._draft;

    if (d.hostname !== undefined && d.hostname !== (c.hostname ?? ""))
      changed.hostname = d.hostname;
    if (d.onboot !== undefined && d.onboot !== (c.onboot ?? false))
      changed.onboot = d.onboot;
    if (d.startup !== undefined && d.startup !== (c.startup ?? ""))
      changed.startup = d.startup;
    if (d.ostype !== undefined && d.ostype !== (c.ostype ?? "unmanaged"))
      changed.ostype = d.ostype;
    if (d.arch !== undefined && d.arch !== (c.arch ?? "amd64"))
      changed.arch = d.arch;
    if (d.console !== undefined && d.console !== (c.console ?? true))
      changed.console = d.console;
    if (d.tty !== undefined && d.tty !== (c.tty ?? 2)) changed.tty = d.tty;
    if (d.cmode !== undefined && d.cmode !== (c.cmode ?? "tty"))
      changed.cmode = d.cmode;
    if (d.protection !== undefined && d.protection !== (c.protection ?? false))
      changed.protection = d.protection;
    if (d.features !== undefined && d.features !== (c.features ?? ""))
      changed.features = d.features;

    if (Object.keys(changed).length === 0) {
      this._editing = false;
      return;
    }

    this._saving = true;
    this._error = "";
    try {
      await guestsApi.updateLxcConfig(this.node, this.vmid, changed);
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

  private _set<K extends keyof LxcConfigUpdate>(
    key: K,
    value: LxcConfigUpdate[K],
  ) {
    this._draft = { ...this._draft, [key]: value };
  }

  private _boolVal(key: keyof LxcConfigUpdate, defaultVal = false): boolean {
    const v = this._draft[key];
    return v !== undefined ? Boolean(v) : defaultVal;
  }

  private _strVal(key: keyof LxcConfigUpdate, defaultVal = ""): string {
    const v = this._draft[key];
    return v !== undefined ? String(v) : defaultVal;
  }

  private _numVal(key: keyof LxcConfigUpdate, defaultVal = 0): number {
    const v = this._draft[key];
    return typeof v === "number" ? v : defaultVal;
  }

  private _renderBoolRow(
    label: string,
    key: keyof LxcConfigUpdate,
    defaultVal = false,
  ) {
    if (!this._editing) {
      const val = this.config
        ? ((this.config as unknown as Record<string, unknown>)[key as string] ??
          defaultVal)
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
    key: keyof LxcConfigUpdate,
    placeholder = "",
  ) {
    const cfgVal = this.config
      ? String((this.config as unknown as Record<string, unknown>)[key as string] ?? "")
      : "";
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
          <!-- Hostname -->
          ${this._editing
            ? html`
                <div class="option-row">
                  <span class="option-label">Hostname</span>
                  <span class="option-value edit">
                    <input
                      type="text"
                      .value=${this._strVal("hostname", cfg.hostname)}
                      placeholder="container-hostname"
                      @input=${(e: Event) =>
                        this._set(
                          "hostname",
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </span>
                </div>
              `
            : html`
                <div class="option-row">
                  <span class="option-label">Hostname</span>
                  <span class="option-value">${cfg.hostname}</span>
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
                      .value=${this._strVal(
                        "ostype",
                        cfg.ostype ?? "unmanaged",
                      )}
                      @change=${(e: Event) =>
                        this._set(
                          "ostype",
                          (e.target as HTMLSelectElement).value,
                        )}
                    >
                      ${LXC_OS_TYPES.map(
                        ([val, label]) => html`
                          <option
                            value=${val}
                            ?selected=${this._strVal(
                              "ostype",
                              cfg.ostype ?? "unmanaged",
                            ) === val}
                          >
                            ${label}
                          </option>
                        `,
                      )}
                    </select>
                  `
                : html`${LXC_OS_TYPES.find(([v]) => v === cfg.ostype)?.[1] ??
                  cfg.ostype ??
                  "—"}`}
            </span>
          </div>

          <!-- Architecture -->
          <div class="option-row">
            <span class="option-label">Architecture</span>
            <span class="option-value ${this._editing ? "edit" : ""}">
              ${this._editing
                ? html`
                    <select
                      .value=${this._strVal("arch", cfg.arch ?? "amd64")}
                      @change=${(e: Event) =>
                        this._set(
                          "arch",
                          (e.target as HTMLSelectElement).value,
                        )}
                    >
                      ${LXC_ARCH_OPTIONS.map(
                        ([val, label]) => html`
                          <option
                            value=${val}
                            ?selected=${this._strVal(
                              "arch",
                              cfg.arch ?? "amd64",
                            ) === val}
                          >
                            ${label}
                          </option>
                        `,
                      )}
                    </select>
                  `
                : html`${cfg.arch ?? "amd64"}`}
            </span>
          </div>

          <!-- /dev/console -->
          ${this._renderBoolRow("/dev/console", "console", true)}

          <!-- TTY count -->
          <div class="option-row">
            <span class="option-label">TTY count</span>
            <span class="option-value ${this._editing ? "edit" : ""}">
              ${this._editing
                ? html`
                    <input
                      type="number"
                      min="0"
                      max="6"
                      .value=${String(this._numVal("tty", cfg.tty ?? 2))}
                      @input=${(e: Event) => {
                        const n = parseInt(
                          (e.target as HTMLInputElement).value,
                          10,
                        );
                        if (!isNaN(n)) this._set("tty", n);
                      }}
                    />
                  `
                : html`${cfg.tty ?? 2}`}
            </span>
          </div>

          <!-- Console mode -->
          <div class="option-row">
            <span class="option-label">Console mode</span>
            <span class="option-value ${this._editing ? "edit" : ""}">
              ${this._editing
                ? html`
                    <select
                      .value=${this._strVal("cmode", cfg.cmode ?? "tty")}
                      @change=${(e: Event) =>
                        this._set(
                          "cmode",
                          (e.target as HTMLSelectElement).value,
                        )}
                    >
                      ${LXC_CMODE_OPTIONS.map(
                        ([val, label]) => html`
                          <option
                            value=${val}
                            ?selected=${this._strVal(
                              "cmode",
                              cfg.cmode ?? "tty",
                            ) === val}
                          >
                            ${label}
                          </option>
                        `,
                      )}
                    </select>
                  `
                : html`${cfg.cmode ?? "tty"}`}
            </span>
          </div>

          <!-- Protection -->
          ${this._renderBoolRow("Protection", "protection")}

          <!-- Unprivileged (read-only) -->
          <div class="option-row">
            <span class="option-label">Unprivileged container</span>
            <span class="option-value muted">
              ${cfg.unprivileged ? "Yes" : "No"} (read-only)
            </span>
          </div>

          <!-- Features -->
          ${this._renderTextRow("Features", "features", "nesting=1")}
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
    "pxa-lxc-options-panel": LxcOptionsPanel;
  }
}

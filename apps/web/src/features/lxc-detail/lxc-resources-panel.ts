import { LitElement, html, nothing, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { guestsApi } from "../../app/api.ts";
import type { LxcConfig, LxcConfigUpdate } from "@proxmox-admin/types";
import { LxcResourcesPanelStyles } from "./lxc-resources-panel.styles.ts";

const DEV_PREFIXES = ["dev"];

function isDevKey(key: string): boolean {
  return DEV_PREFIXES.some((p) => key.startsWith(p) && /\d$/.test(key));
}

@customElement("pxa-lxc-resources-panel")
export class LxcResourcesPanel extends LitElement {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @property({ attribute: false }) config: LxcConfig | null = null;

  @state() private _editing = false;
  @state() private _saving = false;
  @state() private _error = "";
  @state() private _draft: LxcConfigUpdate = {};

  static styles: CSSResultOrNative[] = [LxcResourcesPanelStyles];

  private _fmtMb(mb: number): string {
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GiB` : `${mb} MiB`;
  }

  private _startEdit() {
    if (!this.config) return;
    const c = this.config;
    this._draft = {
      memory: c.memory,
      swap: c.swap,
      cores: c.cores ?? 1,
      cpulimit: c.cpulimit ?? 0,
      cpuunits: c.cpuunits ?? 100,
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

    if (d.memory !== undefined && d.memory !== c.memory)
      changed.memory = d.memory;
    if (d.swap !== undefined && d.swap !== c.swap) changed.swap = d.swap;
    if (d.cores !== undefined && d.cores !== (c.cores ?? 1))
      changed.cores = d.cores;
    if (d.cpulimit !== undefined && d.cpulimit !== (c.cpulimit ?? 0))
      changed.cpulimit = d.cpulimit;
    if (d.cpuunits !== undefined && d.cpuunits !== (c.cpuunits ?? 100))
      changed.cpuunits = d.cpuunits;

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

  private _setNum(key: keyof LxcConfigUpdate, value: string) {
    const n = parseInt(value, 10);
    if (!isNaN(n)) this._draft = { ...this._draft, [key]: n };
  }

  private _numVal(key: keyof LxcConfigUpdate, fallback: number): number {
    const v = this._draft[key];
    return typeof v === "number" ? v : fallback;
  }

  render() {
    const cfg = this.config;
    if (!cfg) return nothing;

    const devs = Object.entries(cfg as unknown as Record<string, unknown>).filter(
      ([k, v]) => isDevKey(k) && typeof v === "string",
    ) as [string, string][];

    return html`
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">Resources</span>
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

        <div class="section-divider">Memory</div>

        <!-- Memory -->
        <div class="res-row">
          <div class="res-label"><span class="res-icon">🖥️</span>Memory</div>
          <div class="res-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <div class="edit-row">
                    <div class="edit-field">
                      <span class="edit-label">Memory (MiB)</span>
                      <input
                        type="number"
                        min="16"
                        step="64"
                        .value=${String(this._numVal("memory", cfg.memory))}
                        @input=${(e: Event) =>
                          this._setNum(
                            "memory",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                    <div class="edit-field">
                      <span class="edit-label">Swap (MiB)</span>
                      <input
                        type="number"
                        min="0"
                        step="64"
                        .value=${String(this._numVal("swap", cfg.swap))}
                        @input=${(e: Event) =>
                          this._setNum(
                            "swap",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                  </div>
                `
              : html`${this._fmtMb(cfg.memory)} RAM + ${this._fmtMb(cfg.swap)}
                swap`}
          </div>
        </div>

        <div class="section-divider">CPU</div>

        <!-- Cores -->
        <div class="res-row">
          <div class="res-label"><span class="res-icon">⚙️</span>Cores</div>
          <div class="res-value ${this._editing ? "edit" : ""}">
            ${this._editing
              ? html`
                  <div class="edit-row">
                    <div class="edit-field">
                      <span class="edit-label">Cores</span>
                      <input
                        type="number"
                        min="1"
                        max="512"
                        .value=${String(this._numVal("cores", cfg.cores ?? 1))}
                        @input=${(e: Event) =>
                          this._setNum(
                            "cores",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                    <div class="edit-field">
                      <span class="edit-label">CPU limit (0 = none)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        .value=${String(
                          this._numVal("cpulimit", cfg.cpulimit ?? 0),
                        )}
                        @input=${(e: Event) =>
                          this._setNum(
                            "cpulimit",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                    <div class="edit-field">
                      <span class="edit-label">CPU units</span>
                      <input
                        type="number"
                        min="8"
                        max="500000"
                        step="100"
                        .value=${String(
                          this._numVal("cpuunits", cfg.cpuunits ?? 100),
                        )}
                        @input=${(e: Event) =>
                          this._setNum(
                            "cpuunits",
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    </div>
                  </div>
                `
              : html`${cfg.cores ?? 1}
                cores${cfg.cpulimit ? ` (limit ${cfg.cpulimit})` : ""}`}
          </div>
        </div>

        <div class="section-divider">Storage</div>

        <!-- Root FS (read-only) -->
        <div class="res-row">
          <div class="res-label"><span class="res-icon">💾</span>Root FS</div>
          <div class="res-value muted">${cfg.rootfs} (read-only)</div>
        </div>

        <!-- Device entries (read-only) -->
        ${devs.map(
          ([key, val]) => html`
            <div class="res-row">
              <div class="res-label">
                <span class="res-icon">🔌</span>${key}
              </div>
              <div class="res-value muted">${val} (read-only)</div>
            </div>
          `,
        )}
        ${this._error
          ? html`<div class="error-banner">${this._error}</div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-lxc-resources-panel": LxcResourcesPanel;
  }
}

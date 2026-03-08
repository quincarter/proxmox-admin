import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Task } from "@lit/task";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { guestsApi } from "../../app/api.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/status-badge/status-badge.ts";
import "../../components/usage-bar/usage-bar.ts";
import "../../components/action-panel/action-panel.ts";
import { VmDetailViewStyles } from "./vm-detail-view.styles.ts";
import type { GuestStatus, QemuConfig } from "@proxmox-admin/types";

// Disk-like keys from QemuConfig
const DISK_PREFIXES = ["scsi", "virtio", "ide", "sata", "sas"];
function isDiskKey(key: string): boolean {
  return DISK_PREFIXES.some((p) => key.startsWith(p) && /\d$/.test(key));
}

@customElement("pxa-vm-detail-view")
export class VmDetailView extends SignalWatcher(LitElement) {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @state() private _statusReload = 0;

  private _statusTask = new Task(this, {
    task: ([node, vmid, _r]) =>
      guestsApi.getQemuStatus(node as string, vmid as number),
    args: () => [this.node, this.vmid, this._statusReload],
  });

  private _configTask = new Task(this, {
    task: ([node, vmid]) =>
      guestsApi.getQemuConfig(node as string, vmid as number),
    args: () => [this.node, this.vmid],
  });

  static styles: CSSResultOrNative[] = [VmDetailViewStyles];

  private _fmt(bytes: number): string {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  private _fmtMb(mb: number): string {
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  }

  private _onActionDone() {
    this._statusReload++;
  }

  private _diskEntries(cfg: QemuConfig): Array<[string, string]> {
    return Object.entries(cfg)
      .filter(([k, v]) => isDiskKey(k) && typeof v === "string")
      .map(([k, v]) => [k, v as string]);
  }

  render() {
    return html`
      <button class="back" @click=${() => navigate(`/nodes/${this.node}`)}>
        ← Node: ${this.node}
      </button>

      ${this._statusTask.render({
        pending: () => html`<div class="loading">Loading VM…</div>`,
        error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
        complete: (status) => html`
          <div class="title-row">
            <h1>${status.name ?? `VM ${this.vmid}`}</h1>
            <span class="vmid-chip">${this.vmid}</span>
            <span class="type-chip">QEMU</span>
            <pxa-status-badge status=${status.status}></pxa-status-badge>
          </div>

          <div class="io-grid">
            <div class="io-card">
              <div class="io-label">Net in / out</div>
              <div class="io-value">
                ${this._fmt(status.netin)} / ${this._fmt(status.netout)}
              </div>
            </div>
            <div class="io-card">
              <div class="io-label">Disk read / write</div>
              <div class="io-value">
                ${this._fmt(status.diskread ?? 0)} /
                ${this._fmt(status.diskwrite ?? 0)}
              </div>
            </div>
          </div>

          <div class="layout">
            <div>
              <div class="gauges">
                <div class="gauges-title">Live Usage</div>
                <pxa-usage-bar
                  label="CPU"
                  .fraction=${status.cpu}
                  valueText="${(status.cpu * 100).toFixed(
                    1,
                  )}% of ${status.cpus} vCPU"
                ></pxa-usage-bar>
                <pxa-usage-bar
                  label="Memory"
                  .fraction=${status.mem / status.maxmem}
                  valueText="${this._fmt(status.mem)} / ${this._fmt(
                    status.maxmem,
                  )}"
                ></pxa-usage-bar>
              </div>

              ${this._configTask.render({
                pending: () => html``,
                error: () => html``,
                complete: (cfg) => {
                  const disks = this._diskEntries(cfg);
                  return html`
                    <div class="config-card">
                      <div class="config-title">Configuration</div>
                      <div class="config-rows">
                        <div class="config-row">
                          <span class="config-key">OS Type</span>
                          <span class="config-val">${cfg.ostype ?? "—"}</span>
                        </div>
                        <div class="config-row">
                          <span class="config-key">Machine</span>
                          <span class="config-val">${cfg.machine ?? "—"}</span>
                        </div>
                        <div class="config-row">
                          <span class="config-key">BIOS</span>
                          <span class="config-val"
                            >${cfg.bios ?? "seabios"}</span
                          >
                        </div>
                        <div class="config-row">
                          <span class="config-key">CPU</span>
                          <span class="config-val">
                            ${cfg.cores ?? "—"} cores × ${cfg.sockets ?? 1}
                            socket ${cfg.cpu ? ` (${cfg.cpu})` : ""}
                          </span>
                        </div>
                        <div class="config-row">
                          <span class="config-key">Memory</span>
                          <span class="config-val">
                            ${this._fmtMb(cfg.memory)}
                            ${cfg.balloon
                              ? ` (min ${this._fmtMb(cfg.balloon)})`
                              : ""}
                          </span>
                        </div>
                        <div class="config-row">
                          <span class="config-key">Boot order</span>
                          <span class="config-val">${cfg.boot ?? "—"}</span>
                        </div>
                        <div class="config-row">
                          <span class="config-key">Start on boot</span>
                          <span class="config-val"
                            >${cfg.onboot ? "Yes" : "No"}</span
                          >
                        </div>
                        <div class="config-row">
                          <span class="config-key">QEMU Agent</span>
                          <span class="config-val"
                            >${cfg.agent ? "Enabled" : "Disabled"}</span
                          >
                        </div>
                        ${cfg.tags
                          ? html`
                              <div class="config-row">
                                <span class="config-key">Tags</span>
                                <span class="config-val">
                                  <div class="tag-list">
                                    ${cfg.tags
                                      .split(";")
                                      .filter(Boolean)
                                      .map(
                                        (t) =>
                                          html`<span class="tag">${t}</span>`,
                                      )}
                                  </div>
                                </span>
                              </div>
                            `
                          : ""}
                        ${disks.length
                          ? html`
                              <div class="disks-section">
                                <div class="disks-title">Disks</div>
                                ${disks.map(
                                  ([k, v]) => html`
                                    <div class="config-row">
                                      <span class="config-key">${k}</span>
                                      <span class="config-val">${v}</span>
                                    </div>
                                  `,
                                )}
                              </div>
                            `
                          : ""}
                      </div>
                    </div>
                  `;
                },
              })}
            </div>

            <div>
              <div class="actions-card">
                <div class="actions-title">Actions</div>
                <pxa-action-panel
                  node=${status.node}
                  .vmid=${status.vmid}
                  type="qemu"
                  status=${status.status as GuestStatus}
                  @action-done=${this._onActionDone}
                ></pxa-action-panel>
              </div>
            </div>
          </div>
        `,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-vm-detail-view": VmDetailView;
  }
}

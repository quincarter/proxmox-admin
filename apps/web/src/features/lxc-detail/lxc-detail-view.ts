import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Task } from "@lit/task";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { guestsApi } from "../../app/api.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/status-badge/status-badge.ts";
import "../../components/usage-bar/usage-bar.ts";
import "../../components/action-panel/action-panel.ts";
import { LxcDetailViewStyles } from "./lxc-detail-view.styles.ts";
import type { GuestStatus } from "@proxmox-admin/types";

@customElement("pxa-lxc-detail-view")
export class LxcDetailView extends SignalWatcher(LitElement) {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @state() private _statusReload = 0;

  private _statusTask = new Task(this, {
    task: ([node, vmid, _r]) =>
      guestsApi.getLxcStatus(node as string, vmid as number),
    args: () => [this.node, this.vmid, this._statusReload],
  });

  private _configTask = new Task(this, {
    task: ([node, vmid]) =>
      guestsApi.getLxcConfig(node as string, vmid as number),
    args: () => [this.node, this.vmid],
  });

  static styles: CSSResultOrNative[] = [LxcDetailViewStyles];

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

  private _backRoute() {
    navigate(`/nodes/${this.node}`);
  }

  render() {
    return html`
      <button class="back" @click=${this._backRoute}>
        ← Node: ${this.node}
      </button>

      ${this._statusTask.render({
        pending: () => html`<div class="loading">Loading container…</div>`,
        error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
        complete: (status) => html`
          <div class="title-row">
            <h1>${status.name ?? `CT ${this.vmid}`}</h1>
            <span class="vmid-chip">${this.vmid}</span>
            <pxa-status-badge status=${status.status}></pxa-status-badge>
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
                <pxa-usage-bar
                  label="Root FS"
                  .fraction=${status.disk / status.maxdisk}
                  valueText="${this._fmt(status.disk)} / ${this._fmt(
                    status.maxdisk,
                  )}"
                ></pxa-usage-bar>
              </div>

              ${this._configTask.render({
                pending: () => html``,
                error: () => html``,
                complete: (cfg) => html`
                  <div class="config-card">
                    <div class="config-title">Configuration</div>
                    <div class="config-rows">
                      <div class="config-row">
                        <span class="config-key">OS Type</span>
                        <span class="config-val">${cfg.ostype ?? "—"}</span>
                      </div>
                      <div class="config-row">
                        <span class="config-key">Architecture</span>
                        <span class="config-val">${cfg.arch ?? "—"}</span>
                      </div>
                      <div class="config-row">
                        <span class="config-key">Memory</span>
                        <span class="config-val"
                          >${this._fmtMb(cfg.memory)} RAM +
                          ${this._fmtMb(cfg.swap)} swap</span
                        >
                      </div>
                      <div class="config-row">
                        <span class="config-key">CPU</span>
                        <span class="config-val"
                          >${cfg.cores ?? "—"}
                          cores${cfg.cpulimit
                            ? ` (limit ${cfg.cpulimit})`
                            : ""}</span
                        >
                      </div>
                      <div class="config-row">
                        <span class="config-key">Root FS</span>
                        <span class="config-val">${cfg.rootfs}</span>
                      </div>
                      <div class="config-row">
                        <span class="config-key">Unprivileged</span>
                        <span class="config-val"
                          >${cfg.unprivileged ? "Yes" : "No"}</span
                        >
                      </div>
                      <div class="config-row">
                        <span class="config-key">Start on boot</span>
                        <span class="config-val"
                          >${cfg.onboot ? "Yes" : "No"}</span
                        >
                      </div>
                      ${cfg.protection
                        ? html`
                            <div class="config-row">
                              <span class="config-key">Protection</span>
                              <span class="config-val">Enabled</span>
                            </div>
                          `
                        : ""}
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
                      ${[0, 1, 2, 3, 4, 5, 6, 7]
                        .filter((i) => cfg[`net${i}`] != null)
                        .map(
                          (i) => html`
                            <div class="config-row">
                              <span class="config-key">net${i}</span>
                              <span class="config-val">${cfg[`net${i}`]}</span>
                            </div>
                          `,
                        )}
                    </div>
                  </div>
                `,
              })}
            </div>

            <div>
              <div class="actions-card">
                <div class="actions-title">Actions</div>
                <pxa-action-panel
                  node=${status.node}
                  .vmid=${status.vmid}
                  type="lxc"
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
    "pxa-lxc-detail-view": LxcDetailView;
  }
}

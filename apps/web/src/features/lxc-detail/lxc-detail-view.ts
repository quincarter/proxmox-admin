import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Task } from "@lit/task";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { guestsApi } from "../../app/api.ts";
import { liveGuests } from "../../app/event-stream.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/status-badge/status-badge.ts";
import "../../components/usage-bar/usage-bar.ts";
import "../../components/action-panel/action-panel.ts";
import "../../components/ssh-terminal/ssh-terminal.ts";
import "./lxc-options-panel.ts";
import "./lxc-resources-panel.ts";
import { LxcDetailViewStyles } from "./lxc-detail-view.styles.ts";
import type {
  GuestCurrentStatus,
  GuestStatus,
  LxcConfig,
  LxcGuest,
} from "@proxmox-admin/types";

type Tab = "summary" | "options" | "resources";

@customElement("pxa-lxc-detail-view")
export class LxcDetailView extends SignalWatcher(LitElement) {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @state() private _statusReload = 0;
  @state() private _configReload = 0;
  @state() private _tab: Tab = "summary";

  private _statusTask = new Task(this, {
    task: ([node, vmid, _r]) =>
      guestsApi.getLxcStatus(node as string, vmid as number),
    args: () => [this.node, this.vmid, this._statusReload],
  });

  private _configTask = new Task(this, {
    task: ([node, vmid, _r]) =>
      guestsApi.getLxcConfig(node as string, vmid as number),
    args: () => [this.node, this.vmid, this._configReload],
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

  private _onConfigUpdated() {
    this._configReload++;
  }

  private _backRoute() {
    navigate(`/nodes/${this.node}`);
  }
  @state() private _showTerminal = false;

  private _toggleTerminal() {
    this._showTerminal = !this._showTerminal;
  }

  private _setTab(tab: Tab) {
    this._tab = tab;
  }

  /** Live LXC guest data from the SSE stream, if available */
  private get _liveCt(): LxcGuest | undefined {
    return (liveGuests.value.get(this.node) ?? []).find(
      (g): g is LxcGuest => g.type === "lxc" && g.vmid === this.vmid,
    );
  }

  private _renderSummary(status: GuestCurrentStatus, cfg: LxcConfig | null) {
    const live = this._liveCt;
    const cpu = live?.cpu ?? status.cpu;
    const maxcpu = live?.maxcpu ?? status.cpus;
    const mem = live?.mem ?? status.mem;
    const maxmem = live?.maxmem ?? status.maxmem;
    const disk = live?.disk ?? status.disk;
    const maxdisk = live?.maxdisk ?? status.maxdisk;

    return html`
      <div class="layout">
        <div>
          <div class="gauges">
            <div class="gauges-title">Live Usage</div>
            <pxa-usage-bar
              label="CPU"
              .fraction=${cpu}
              valueText="${(cpu * 100).toFixed(1)}% of ${maxcpu} vCPU"
            ></pxa-usage-bar>
            <pxa-usage-bar
              label="Memory"
              .fraction=${mem / maxmem}
              valueText="${this._fmt(mem)} / ${this._fmt(maxmem)}"
            ></pxa-usage-bar>
            <pxa-usage-bar
              label="Root FS"
              .fraction=${disk / maxdisk}
              valueText="${this._fmt(disk)} / ${this._fmt(maxdisk)}"
            ></pxa-usage-bar>
          </div>

          ${cfg
            ? html`
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
                                    (t) => html`<span class="tag">${t}</span>`,
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
              `
            : ""}
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
    `;
  }

  render() {
    return html`
      <button class="back" @click=${this._backRoute}>
        ← Node: ${this.node}
      </button>

      <button class="ssh-btn" @click=${this._toggleTerminal}>
        ${this._showTerminal ? "Hide Terminal" : "Terminal"}
      </button>

      ${this._showTerminal
        ? html`<div class="ssh-terminal-panel">
            <pxa-ssh-terminal
              .node=${this.node}
              .vmid=${this.vmid}
              guestType="lxc"
            ></pxa-ssh-terminal>
          </div>`
        : null}
      ${this._statusTask.render({
        pending: () => html`<div class="loading">Loading container…</div>`,
        error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
        complete: (status) => html`
          <div class="title-row">
            <h1>${status.name ?? `CT ${this.vmid}`}</h1>
            <span class="vmid-chip">${this.vmid}</span>
            <pxa-status-badge status=${status.status}></pxa-status-badge>
          </div>

          <nav class="tabs">
            <button
              class="tab-btn ${this._tab === "summary" ? "active" : ""}"
              @click=${() => this._setTab("summary")}
            >
              Summary
            </button>
            <button
              class="tab-btn ${this._tab === "options" ? "active" : ""}"
              @click=${() => this._setTab("options")}
            >
              Options
            </button>
            <button
              class="tab-btn ${this._tab === "resources" ? "active" : ""}"
              @click=${() => this._setTab("resources")}
            >
              Resources
            </button>
          </nav>

          ${this._tab === "summary"
            ? html`<div class="tab-content">
                ${this._configTask.render({
                  pending: () => this._renderSummary(status, null),
                  error: () => this._renderSummary(status, null),
                  complete: (cfg) => this._renderSummary(status, cfg),
                })}
              </div>`
            : this._tab === "options"
              ? html`<div class="tab-content">
                  ${this._configTask.render({
                    pending: () => html`<div class="loading">Loading…</div>`,
                    error: (e) => html`<div class="error">${String(e)}</div>`,
                    complete: (cfg) => html`
                      <pxa-lxc-options-panel
                        node=${this.node}
                        .vmid=${this.vmid}
                        .config=${cfg}
                        @config-updated=${this._onConfigUpdated}
                      ></pxa-lxc-options-panel>
                    `,
                  })}
                </div>`
              : html`<div class="tab-content">
                  ${this._configTask.render({
                    pending: () => html`<div class="loading">Loading…</div>`,
                    error: (e) => html`<div class="error">${String(e)}</div>`,
                    complete: (cfg) => html`
                      <pxa-lxc-resources-panel
                        node=${this.node}
                        .vmid=${this.vmid}
                        .config=${cfg}
                        @config-updated=${this._onConfigUpdated}
                      ></pxa-lxc-resources-panel>
                    `,
                  })}
                </div>`}
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

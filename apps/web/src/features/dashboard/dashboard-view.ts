import { LitElement, html, svg, type CSSResultOrNative } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { nodesApi, guestsApi, storageApi } from "../../app/api.ts";
import { liveNodes } from "../../app/event-stream.ts";
import type { NodeSummary } from "@proxmox-admin/types";
import "../../components/status-badge/status-badge.ts";
import { DashboardViewStyles } from "./dashboard-view.styles.ts";

@customElement("pxa-dashboard-view")
export class DashboardView extends LitElement {
  private _nodesTask = new Task(this, {
    task: () => nodesApi.list(),
    args: () => [],
  });

  private _guestsTask = new Task(this, {
    task: () => guestsApi.listAll(),
    args: () => [],
  });

  private _storageTask = new Task(this, {
    task: () => storageApi.listAll(),
    args: () => [],
  });

  static styles: CSSResultOrNative[] = [DashboardViewStyles];

  private _usageFillClass(fraction: number): string {
    if (fraction > 0.85) return "danger";
    if (fraction > 0.65) return "warn";
    return "";
  }

  private _formatBytes(bytes: number): string {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
    return `${bytes} B`;
  }

  private _donut(fraction: number, size = 96) {
    const r = 34;
    const cx = size / 2;
    const cy = size / 2;
    const circ = 2 * Math.PI * r;
    const f = Math.min(Math.max(fraction, 0), 1);
    const filled = circ * f;
    const color =
      f > 0.85
        ? "var(--color-danger)"
        : f > 0.65
          ? "var(--color-warning)"
          : "var(--color-success)";
    return svg`
      <svg
        width="${size}"
        height="${size}"
        viewBox="0 0 ${size} ${size}"
        style="flex-shrink:0"
      >
        <circle
          cx="${cx}" cy="${cy}" r="${r}"
          fill="none"
          stroke="var(--color-bg-overlay)"
          stroke-width="8"
        />
        <circle
          cx="${cx}" cy="${cy}" r="${r}"
          fill="none"
          stroke="${color}"
          stroke-width="8"
          stroke-dasharray="${filled} ${circ - filled}"
          stroke-dashoffset="${circ * 0.25}"
          stroke-linecap="round"
        />
        <text
          x="${cx}" y="${cy}"
          text-anchor="middle"
          dominant-baseline="central"
          fill="${color}"
          font-size="14"
          font-weight="700"
          font-family="var(--font-mono)"
        >${Math.round(f * 100)}%</text>
      </svg>
    `;
  }

  private _renderDcMetrics(nodes: NodeSummary[]) {
    // Guard: only nodes that are online AND have usage data (offline nodes
    // may lack a usage object entirely when returned by the Proxmox API).
    const online = nodes.filter((n) => n.status === "online" && n.usage);
    const totalCores = online.reduce((s, n) => s + (n.usage?.maxcpu ?? 0), 0);
    const usedCores = online.reduce(
      (s, n) => s + (n.usage?.cpu ?? 0) * (n.usage?.maxcpu ?? 0),
      0,
    );
    const totalMem = online.reduce((s, n) => s + (n.usage?.maxmem ?? 0), 0);
    const usedMem = online.reduce((s, n) => s + (n.usage?.mem ?? 0), 0);
    const cpuFrac = totalCores > 0 ? usedCores / totalCores : 0;
    const memFrac = totalMem > 0 ? usedMem / totalMem : 0;
    const isLive = liveNodes.value !== null;

    return html`
      <div class="dc-section">
        <div class="dc-section-header">
          <span class="section-title">Datacenter</span>
          ${isLive
            ? html`<span class="dc-live-badge">
                <span class="dc-live-dot"></span>Live
              </span>`
            : ""}
        </div>
        <div class="dc-metrics">
          <div class="dc-card">
            ${this._donut(cpuFrac)}
            <div class="dc-info">
              <div class="dc-label">CPU</div>
              <div class="dc-value">${(cpuFrac * 100).toFixed(1)}%</div>
              <div class="dc-sub">
                ${usedCores.toFixed(1)} / ${totalCores} cores
              </div>
              <div class="dc-sub">
                ${online.length} node${online.length !== 1 ? "s" : ""} online
              </div>
            </div>
          </div>
          <div class="dc-card">
            ${this._donut(memFrac)}
            <div class="dc-info">
              <div class="dc-label">Memory</div>
              <div class="dc-value">${(memFrac * 100).toFixed(1)}%</div>
              <div class="dc-sub">
                ${this._formatBytes(usedMem)} / ${this._formatBytes(totalMem)}
              </div>
              <div class="dc-sub">
                ${online.length} node${online.length !== 1 ? "s" : ""} online
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <h1>Overview</h1>

      ${this._nodesTask.render({
        pending: () => html`<div class="loading">Loading nodes…</div>`,
        complete: (polledNodes) => {
          const nodes = liveNodes.value ?? polledNodes;
          const online = nodes.filter((n) => n.status === "online").length;
          const guests = this._guestsTask.value ?? [];
          const running = guests.filter((g) => g.status === "running").length;
          const storage = this._storageTask.value ?? [];
          return html`
            ${this._renderDcMetrics(nodes)}
            <div class="grid">
              <div class="stat-card">
                <div class="stat-label">Nodes</div>
                <div class="stat-value">${online} / ${nodes.length}</div>
                <div class="stat-sub">online</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Guests</div>
                <div class="stat-value">${running} / ${guests.length}</div>
                <div class="stat-sub">running</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Storage pools</div>
                <div class="stat-value">${storage.length}</div>
                <div class="stat-sub">configured</div>
              </div>
            </div>

            <div class="table-card">
              <div class="table-header">
                <div class="section-title">Nodes</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Node</th>
                    <th>Status</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  ${nodes.map((n) => {
                    const cpuFrac = n.usage?.cpu ?? 0;
                    const memFrac = n.usage ? n.usage.mem / n.usage.maxmem : 0;
                    const uptimeH = Math.floor((n.usage?.uptime ?? 0) / 3600);
                    const uptimeMemo =
                      uptimeH > 24
                        ? `${Math.floor(uptimeH / 24)}d ${uptimeH % 24}h`
                        : `${uptimeH}h`;
                    return html`
                      <tr>
                        <td class="name">${n.node}</td>
                        <td>
                          <pxa-status-badge
                            status=${n.status}
                          ></pxa-status-badge>
                        </td>
                        <td>
                          <div style="display:flex;align-items:center;gap:6px">
                            <div class="usage-bar">
                              <div
                                class="usage-fill ${this._usageFillClass(
                                  cpuFrac,
                                )}"
                                style="width:${(cpuFrac * 100).toFixed(0)}%"
                              ></div>
                            </div>
                            <span class="mono"
                              >${(cpuFrac * 100).toFixed(1)}%</span
                            >
                          </div>
                        </td>
                        <td>
                          <div style="display:flex;align-items:center;gap:6px">
                            <div class="usage-bar">
                              <div
                                class="usage-fill ${this._usageFillClass(
                                  memFrac,
                                )}"
                                style="width:${(memFrac * 100).toFixed(0)}%"
                              ></div>
                            </div>
                            <span class="mono"
                              >${this._formatBytes(n.usage?.mem ?? 0)}</span
                            >
                          </div>
                        </td>
                        <td class="mono">${uptimeMemo}</td>
                      </tr>
                    `;
                  })}
                </tbody>
              </table>
            </div>
          `;
        },
        error: (err) =>
          html`<div class="error">Failed to load nodes: ${String(err)}</div>`,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-dashboard-view": DashboardView;
  }
}

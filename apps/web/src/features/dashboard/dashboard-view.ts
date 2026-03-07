import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { nodesApi, guestsApi, storageApi } from "../../app/api.ts";
import "../../components/status-badge.ts";

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

  static styles = css`
    :host {
      display: block;
      padding: var(--space-6);
      max-width: 1400px;
    }

    h1 {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-6);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }

    .stat-card {
      background: var(--color-bg-elevated);
      border-radius: var(--radius-md);
      padding: var(--space-5);
      border: 1px solid var(--color-bg-overlay);
    }

    .stat-label {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: var(--space-2);
    }

    .stat-value {
      font-size: var(--text-3xl);
      font-weight: var(--weight-bold);
      color: var(--color-text-primary);
      line-height: 1;
    }

    .stat-sub {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      margin-top: var(--space-1);
    }

    .section-title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--color-text-primary);
      margin: 0 0 var(--space-3);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }

    th {
      text-align: left;
      padding: var(--space-2) var(--space-3);
      color: var(--color-text-muted);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--color-bg-overlay);
    }

    td {
      padding: var(--space-2) var(--space-3);
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-bg-surface);
    }

    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: var(--color-bg-surface);
    }

    .table-card {
      background: var(--color-bg-elevated);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-bg-overlay);
      overflow: hidden;
      margin-bottom: var(--space-6);
    }

    .table-header {
      padding: var(--space-4) var(--space-4) var(--space-3);
      border-bottom: 1px solid var(--color-bg-overlay);
    }

    .loading {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      padding: var(--space-4);
      text-align: center;
    }

    .error {
      color: var(--color-danger);
      font-size: var(--text-sm);
      padding: var(--space-4);
    }

    .name {
      color: var(--color-text-primary);
      font-weight: var(--weight-medium);
    }
    .mono {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
    }
    .usage-bar {
      height: 4px;
      background: var(--color-bg-overlay);
      border-radius: var(--radius-full);
      overflow: hidden;
      width: 80px;
    }
    .usage-fill {
      height: 100%;
      border-radius: var(--radius-full);
      background: var(--color-brand);
      transition: width var(--duration-normal);
    }
    .usage-fill.warn {
      background: var(--color-warning);
    }
    .usage-fill.danger {
      background: var(--color-danger);
    }
  `;

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

  render() {
    return html`
      <h1>Overview</h1>

      ${this._nodesTask.render({
        pending: () => html`<div class="loading">Loading nodes…</div>`,
        complete: (nodes) => {
          const online = nodes.filter((n) => n.status === "online").length;
          const guests = this._guestsTask.value ?? [];
          const running = guests.filter((g) => g.status === "running").length;
          const storage = this._storageTask.value ?? [];
          return html`
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

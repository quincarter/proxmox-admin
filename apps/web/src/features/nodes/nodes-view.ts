import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { nodesApi } from "../../app/api.ts";
import "../../components/status-badge.ts";

@customElement("pxa-nodes-view")
export class NodesView extends LitElement {
  private _task = new Task(this, {
    task: () => nodesApi.list(),
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
    .table-card {
      background: var(--color-bg-elevated);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-bg-overlay);
      overflow: hidden;
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
      font-weight: 600;
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
    .name {
      color: var(--color-text-primary);
      font-weight: 500;
    }
    .mono {
      font-family: var(--font-mono);
      font-size: var(--text-xs);
    }
    .loading {
      color: var(--color-text-muted);
      padding: var(--space-4);
    }
    .error {
      color: var(--color-danger);
      padding: var(--space-4);
    }
  `;

  private _fmt(bytes: number): string {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  render() {
    return html`
      <h1>Nodes</h1>
      <div class="table-card">
        ${this._task.render({
          pending: () => html`<div class="loading">Loading…</div>`,
          complete: (nodes) =>
            html` <table>
              <thead>
                <tr>
                  <th>Node</th>
                  <th>Status</th>
                  <th>IP</th>
                  <th>CPU</th>
                  <th>Memory</th>
                  <th>Disk</th>
                  <th>Uptime</th>
                </tr>
              </thead>
              <tbody>
                ${nodes.map((n) => {
                  const u = n.usage;
                  return html` <tr>
                    <td class="name">${n.node}</td>
                    <td>
                      <pxa-status-badge status=${n.status}></pxa-status-badge>
                    </td>
                    <td class="mono">${n.ip ?? "—"}</td>
                    <td class="mono">
                      ${u ? `${(u.cpu * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td class="mono">
                      ${u
                        ? `${this._fmt(u.mem)} / ${this._fmt(u.maxmem)}`
                        : "—"}
                    </td>
                    <td class="mono">
                      ${u
                        ? `${this._fmt(u.disk)} / ${this._fmt(u.maxdisk)}`
                        : "—"}
                    </td>
                    <td class="mono">
                      ${u ? `${Math.floor(u.uptime / 3600)}h` : "—"}
                    </td>
                  </tr>`;
                })}
              </tbody>
            </table>`,
          error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-nodes-view": NodesView;
  }
}

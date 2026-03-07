import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { guestsApi } from "../../app/api.ts";
import "../../components/status-badge.ts";

@customElement("pxa-lxc-view")
export class LxcView extends LitElement {
  // Use the cluster-level guests endpoint, then filter to lxc
  private _task = new Task(this, {
    task: async () => {
      const all = await guestsApi.listAll();
      return all.filter((g) => g.type === "lxc");
    },
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
    .vmid {
      color: var(--color-text-muted);
      font-size: var(--text-xs);
    }
    .tags {
      display: flex;
      gap: var(--space-1);
      flex-wrap: wrap;
    }
    .tag {
      background: var(--color-bg-overlay);
      border-radius: var(--radius-sm);
      padding: 1px 6px;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .loading {
      color: var(--color-text-muted);
      padding: var(--space-4);
    }
    .error {
      color: var(--color-danger);
      padding: var(--space-4);
    }
    .empty {
      color: var(--color-text-muted);
      padding: var(--space-6);
      text-align: center;
    }
  `;

  private _fmt(bytes: number): string {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  render() {
    return html`
      <h1>Containers (LXC)</h1>
      <div class="table-card">
        ${this._task.render({
          pending: () => html`<div class="loading">Loading containers…</div>`,
          complete: (guests) =>
            guests.length === 0
              ? html`<div class="empty">No LXC containers found.</div>`
              : html` <table>
                  <thead>
                    <tr>
                      <th>VMID</th>
                      <th>Name</th>
                      <th>Node</th>
                      <th>Status</th>
                      <th>CPU</th>
                      <th>Memory</th>
                      <th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${guests.map(
                      (g) =>
                        html` <tr>
                          <td class="vmid mono">${g.vmid}</td>
                          <td class="name">${g.name}</td>
                          <td class="mono">${g.node}</td>
                          <td>
                            <pxa-status-badge
                              status=${g.status}
                            ></pxa-status-badge>
                          </td>
                          <td class="mono">${(g.cpu * 100).toFixed(1)}%</td>
                          <td class="mono">
                            ${this._fmt(g.mem)} / ${this._fmt(g.maxmem)}
                          </td>
                          <td>
                            <div class="tags">
                              ${(g.tags ?? "")
                                .split(";")
                                .filter(Boolean)
                                .map(
                                  (t) => html`<span class="tag">${t}</span>`,
                                )}
                            </div>
                          </td>
                        </tr>`,
                    )}
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
    "pxa-lxc-view": LxcView;
  }
}

import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { storageApi } from "../../app/api.ts";

@customElement("pxa-storage-view")
export class StorageView extends LitElement {
  private _task = new Task(this, {
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
    .usage-bar {
      height: 4px;
      background: var(--color-bg-overlay);
      border-radius: 9999px;
      overflow: hidden;
      width: 80px;
    }
    .usage-fill {
      height: 100%;
      border-radius: 9999px;
      background: var(--color-brand);
    }
    .usage-fill.warn {
      background: var(--color-warning);
    }
    .usage-fill.danger {
      background: var(--color-danger);
    }
    .badge {
      display: inline-block;
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
  `;

  private _fmt(bytes?: number): string {
    if (!bytes) return "—";
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  private _usageClass(usage?: number): string {
    if (!usage) return "";
    if (usage > 0.85) return "danger";
    if (usage > 0.65) return "warn";
    return "";
  }

  render() {
    return html`
      <h1>Storage</h1>
      <div class="table-card">
        ${this._task.render({
          pending: () => html`<div class="loading">Loading storage…</div>`,
          complete: (pools) =>
            html` <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Content</th>
                  <th>Used</th>
                  <th>Available</th>
                  <th>Usage</th>
                </tr>
              </thead>
              <tbody>
                ${pools.map((s) => {
                  const usageFrac =
                    s.usage ??
                    (s.used && s.total ? s.used / s.total : undefined);
                  return html` <tr>
                    <td class="name">${s.storage}</td>
                    <td><span class="badge">${s.type}</span></td>
                    <td class="mono" style="font-size:11px">${s.content}</td>
                    <td class="mono">${this._fmt(s.used)}</td>
                    <td class="mono">${this._fmt(s.avail)}</td>
                    <td>
                      ${usageFrac != null
                        ? html` <div
                            style="display:flex;align-items:center;gap:6px"
                          >
                            <div class="usage-bar">
                              <div
                                class="usage-fill ${this._usageClass(
                                  usageFrac,
                                )}"
                                style="width:${(usageFrac * 100).toFixed(0)}%"
                              ></div>
                            </div>
                            <span class="mono"
                              >${(usageFrac * 100).toFixed(0)}%</span
                            >
                          </div>`
                        : html`<span style="color:var(--color-text-muted)"
                            >—</span
                          >`}
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
    "pxa-storage-view": StorageView;
  }
}

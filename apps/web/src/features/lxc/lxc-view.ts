import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { guestsApi } from "../../app/api.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/status-badge/status-badge.ts";
import { LxcViewStyles } from "./lxc-view.styles.ts";

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

  static styles: CSSResultOrNative[] = [LxcViewStyles];

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
                        html` <tr
                          style="cursor:pointer"
                          @click=${() => navigate(`/lxc/${g.node}/${g.vmid}`)}
                        >
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

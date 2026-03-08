import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { guestsApi } from "../../app/api.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/status-badge/status-badge.ts";
import { VmViewStyles } from "./vm-view.styles.ts";

@customElement("pxa-vm-view")
export class VmView extends LitElement {
  private _task = new Task(this, {
    task: async () => {
      const all = await guestsApi.listAll();
      return all.filter((g) => g.type === "qemu");
    },
    args: () => [],
  });

  static styles: CSSResultOrNative[] = [VmViewStyles];

  private _fmt(bytes: number): string {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  render() {
    return html`
      <h1>Virtual Machines</h1>
      <div class="table-card">
        ${this._task.render({
          pending: () => html`<div class="loading">Loading VMs…</div>`,
          complete: (vms) =>
            vms.length === 0
              ? html`<div class="empty">No virtual machines found.</div>`
              : html`
                  <table>
                    <thead>
                      <tr>
                        <th>VMID</th>
                        <th>Name</th>
                        <th>Node</th>
                        <th>Status</th>
                        <th>CPU</th>
                        <th>Memory</th>
                        <th>Uptime</th>
                        <th>Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${vms.map(
                        (v) => html`
                          <tr
                            @click=${() => navigate(`/vm/${v.node}/${v.vmid}`)}
                          >
                            <td class="vmid">${v.vmid}</td>
                            <td class="name">${v.name}</td>
                            <td class="mono">${v.node}</td>
                            <td>
                              <pxa-status-badge
                                status=${v.status}
                              ></pxa-status-badge>
                            </td>
                            <td class="mono">${(v.cpu * 100).toFixed(1)}%</td>
                            <td class="mono">
                              ${this._fmt(v.mem)} / ${this._fmt(v.maxmem)}
                            </td>
                            <td class="mono">
                              ${v.uptime
                                ? `${Math.floor(v.uptime / 3600)}h`
                                : "—"}
                            </td>
                            <td>
                              <div class="tag-list">
                                ${(v.tags ?? "")
                                  .split(";")
                                  .filter(Boolean)
                                  .map(
                                    (t) => html`<span class="tag">${t}</span>`,
                                  )}
                              </div>
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                `,
          error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-vm-view": VmView;
  }
}

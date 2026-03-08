import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Task } from "@lit/task";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { nodesApi, guestsApi } from "../../app/api.ts";
import { NodeDetailViewStyles } from "./node-detail-view.styles.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/status-badge/status-badge.ts";
import "../../components/usage-bar/usage-bar.ts";
import "../../components/action-panel/action-panel.ts";
import type { TaskSummary } from "@proxmox-admin/types";

@customElement("pxa-node-detail-view")
export class NodeDetailView extends SignalWatcher(LitElement) {
  @property({ type: String }) node = "";
  @state() private _actionReload = 0;

  private _detailTask = new Task(this, {
    task: ([node]) => nodesApi.get(node as string),
    args: () => [this.node],
  });

  private _lxcTask = new Task(this, {
    task: ([node, _r]) => guestsApi.listLxc(node as string),
    args: () => [this.node, this._actionReload],
  });

  private _qemuTask = new Task(this, {
    task: ([node, _r]) => guestsApi.listQemu(node as string),
    args: () => [this.node, this._actionReload],
  });

  private _tasksTask = new Task(this, {
    task: ([node]) => nodesApi.getTasks(node as string),
    args: () => [this.node],
  });

  static styles: CSSResultOrNative[] = [NodeDetailViewStyles];

  private _fmt(bytes: number): string {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  private _fmtUptime(secs: number): string {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  private _fmtDate(ts: number): string {
    return new Date(ts * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private _taskStatusClass(task: TaskSummary): string {
    if (task.status === "running") return "task-running";
    if (task.status === "OK") return "task-ok";
    return "task-err";
  }

  private _onActionDone() {
    this._actionReload++;
  }

  render() {
    return html`
      <button class="back" @click=${() => navigate("/nodes")}>← Nodes</button>

      ${this._detailTask.render({
        pending: () => html`<div class="loading">Loading node…</div>`,
        error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
        complete: (node) => {
          const u = node.usage;
          return html`
            <h1>
              <pxa-status-badge status=${node.status}></pxa-status-badge>
              &nbsp;${node.node}
            </h1>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Uptime</div>
                <div class="stat-value">
                  ${u ? this._fmtUptime(u.uptime) : "—"}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Load avg (1/5/15m)</div>
                <div class="stat-value" style="font-size:15px">
                  ${u ? u.loadavg.map((l) => l.toFixed(2)).join(" / ") : "—"}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">PVE Version</div>
                <div class="stat-value" style="font-size:15px">
                  ${node.version.version}
                </div>
                <div class="stat-sub">${node.version.release}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Subscription</div>
                <div class="stat-value" style="font-size:15px">
                  ${node.subscription?.status ?? "—"}
                </div>
                <div class="stat-sub">
                  ${node.subscription?.productname ?? ""}
                </div>
              </div>
            </div>

            ${u
              ? html`
                  <div class="gauges">
                    <h3>Resource usage</h3>
                    <pxa-usage-bar
                      label="CPU"
                      .fraction=${u.cpu}
                      valueText="${(u.cpu * 100).toFixed(
                        1,
                      )}% of ${u.maxcpu} cores"
                    ></pxa-usage-bar>
                    <pxa-usage-bar
                      label="Memory"
                      .fraction=${u.mem / u.maxmem}
                      valueText="${this._fmt(u.mem)} / ${this._fmt(u.maxmem)}"
                    ></pxa-usage-bar>
                    <pxa-usage-bar
                      label="Root FS"
                      .fraction=${u.disk / u.maxdisk}
                      valueText="${this._fmt(u.disk)} / ${this._fmt(u.maxdisk)}"
                    ></pxa-usage-bar>
                  </div>
                `
              : ""}

            <div class="info-grid">
              <span class="info-key">Node ID</span>
              <span class="info-val">${node.id}</span>
              <span class="info-key">IP</span>
              <span class="info-val">${node.ip ?? "—"}</span>
              <span class="info-key">CPU cores</span>
              <span class="info-val">${u?.maxcpu ?? "—"}</span>
              <span class="info-key">Total memory</span>
              <span class="info-val">${u ? this._fmt(u.maxmem) : "—"}</span>
            </div>
          `;
        },
      })}

      <!-- LXC containers -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">LXC Containers</span>
        </div>
        <div class="table-card">
          ${this._lxcTask.render({
            pending: () => html`<div class="loading">Loading containers…</div>`,
            error: (e) => html`<div class="error">${String(e)}</div>`,
            complete: (containers) => {
              if (!containers.length) {
                return html`<div class="loading">
                  No containers on this node.
                </div>`;
              }
              // Ensure each container has the node property set
              const containersWithNode = containers.map((c) => ({
                ...c,
                node: this.node,
              }));
              return html`
                <table>
                  <thead>
                    <tr>
                      <th>VMID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>CPU</th>
                      <th>Memory</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${containersWithNode.map(
                      (c) => html`
                        <tr
                          @click=${() => navigate(`/lxc/${c.node}/${c.vmid}`)}
                        >
                          <td class="vmid">${c.vmid}</td>
                          <td class="name">${c.name}</td>
                          <td>
                            <pxa-status-badge
                              status=${c.status}
                            ></pxa-status-badge>
                          </td>
                          <td class="mono">${(c.cpu * 100).toFixed(1)}%</td>
                          <td class="mono">
                            ${this._fmt(c.mem)} / ${this._fmt(c.maxmem)}
                          </td>
                          <td @click=${(e: Event) => e.stopPropagation()}>
                            <pxa-action-panel
                              node=${c.node}
                              .vmid=${c.vmid}
                              type="lxc"
                              status=${c.status}
                              @action-done=${this._onActionDone}
                            ></pxa-action-panel>
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `;
            },
          })}
        </div>
      </div>

      <!-- QEMU VMs -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Virtual Machines</span>
        </div>
        <div class="table-card">
          ${this._qemuTask.render({
            pending: () => html`<div class="loading">Loading VMs…</div>`,
            error: (e) => html`<div class="error">${String(e)}</div>`,
            complete: (vms) => {
              if (!vms.length) {
                return html`<div class="loading">No VMs on this node.</div>`;
              }
              // Ensure each VM has the node property set
              const vmsWithNode = vms.map((v) => ({ ...v, node: this.node }));
              return html`
                <table>
                  <thead>
                    <tr>
                      <th>VMID</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>CPU</th>
                      <th>Memory</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${vmsWithNode.map(
                      (v) => html`
                        <tr @click=${() => navigate(`/vm/${v.node}/${v.vmid}`)}>
                          <td class="vmid">${v.vmid}</td>
                          <td class="name">${v.name}</td>
                          <td>
                            <pxa-status-badge
                              status=${v.status}
                            ></pxa-status-badge>
                          </td>
                          <td class="mono">${(v.cpu * 100).toFixed(1)}%</td>
                          <td class="mono">
                            ${this._fmt(v.mem)} / ${this._fmt(v.maxmem)}
                          </td>
                          <td @click=${(e: Event) => e.stopPropagation()}>
                            <pxa-action-panel
                              node=${v.node}
                              .vmid=${v.vmid}
                              type="qemu"
                              status=${v.status}
                              @action-done=${this._onActionDone}
                            ></pxa-action-panel>
                          </td>
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              `;
            },
          })}
        </div>
      </div>

      <!-- Recent tasks -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">Recent Tasks</span>
        </div>
        <div class="table-card">
          ${this._tasksTask.render({
            pending: () => html`<div class="loading">Loading tasks…</div>`,
            error: () =>
              html`<div class="loading" style="color:var(--color-text-muted)">
                Task history unavailable.
              </div>`,
            complete: (tasks) =>
              tasks.length === 0
                ? html`<div class="loading">No recent tasks.</div>`
                : html`
                    <table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>ID</th>
                          <th>User</th>
                          <th>Started</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${tasks.slice(0, 25).map(
                          (t) => html`
                            <tr class="task-row">
                              <td><span class="badge">${t.type}</span></td>
                              <td class="mono">${t.id ?? "—"}</td>
                              <td class="mono">${t.user}</td>
                              <td class="mono">
                                ${this._fmtDate(t.starttime)}
                              </td>
                              <td class="${this._taskStatusClass(t)}">
                                ${t.status}
                              </td>
                            </tr>
                          `,
                        )}
                      </tbody>
                    </table>
                  `,
          })}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-node-detail-view": NodeDetailView;
  }
}

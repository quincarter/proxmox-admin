import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { nodesApi } from "../../app/api.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/status-badge/status-badge.ts";
import "../../components/usage-bar/usage-bar.ts";
import { NodesViewStyles } from "./nodes-view.styles.ts";

@customElement("pxa-nodes-view")
export class NodesView extends LitElement {
  private _task = new Task(this, {
    task: () => nodesApi.list(),
    args: () => [],
  });

  static styles: CSSResultOrNative[] = [NodesViewStyles];

  private _fmt(bytes: number): string {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  render() {
    return html`
      <h1>Nodes</h1>
      ${this._task.render({
        pending: () => html`<div class="loading">Loading…</div>`,
        complete: (nodes) => html`
          <div class="cards-grid">
            ${nodes.map((n) => {
              const u = n.usage;
              return html`
                <div
                  class="node-card"
                  role="button"
                  tabindex="0"
                  @click=${() => navigate(`/nodes/${n.node}`)}
                  @keydown=${(e: KeyboardEvent) =>
                    e.key === "Enter" && navigate(`/nodes/${n.node}`)}
                >
                  <div class="card-header">
                    <div>
                      <div class="node-name">${n.node}</div>
                      ${n.ip ? html`<div class="card-ip">${n.ip}</div>` : ""}
                    </div>
                    <pxa-status-badge status=${n.status}></pxa-status-badge>
                  </div>
                  ${u
                    ? html`
                        <div class="card-stats">
                          <div class="stat-row">
                            <span class="stat-label">CPU</span>
                            <pxa-usage-bar
                              .fraction=${u.cpu}
                              valueText="${(u.cpu * 100).toFixed(1)}%"
                            ></pxa-usage-bar>
                          </div>
                          <div class="stat-row">
                            <span class="stat-label">Memory</span>
                            <pxa-usage-bar
                              .fraction=${u.mem / u.maxmem}
                              valueText="${this._fmt(u.mem)} / ${this._fmt(
                                u.maxmem,
                              )}"
                            ></pxa-usage-bar>
                          </div>
                          <div class="stat-row">
                            <span class="stat-label">Root FS</span>
                            <pxa-usage-bar
                              .fraction=${u.disk / u.maxdisk}
                              valueText="${this._fmt(u.disk)} / ${this._fmt(
                                u.maxdisk,
                              )}"
                            ></pxa-usage-bar>
                          </div>
                        </div>
                        <div class="card-footer">
                          Up ${Math.floor(u.uptime / 3600)}h
                        </div>
                      `
                    : ""}
                </div>
              `;
            })}
          </div>
        `,
        error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-nodes-view": NodesView;
  }
}

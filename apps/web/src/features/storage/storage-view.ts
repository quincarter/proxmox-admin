import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement } from "lit/decorators.js";
import { Task } from "@lit/task";
import { storageApi } from "../../app/api.ts";
import { navigate } from "../../state/app.state.ts";
import "../../components/usage-donut/usage-donut.ts";
import { StorageViewStyles } from "./storage-view.styles.ts";

@customElement("pxa-storage-view")
export class StorageView extends LitElement {
  private _task = new Task(this, {
    task: () => storageApi.listAll(),
    args: () => [],
  });

  static styles: CSSResultOrNative[] = [StorageViewStyles];

  private _fmt(bytes?: number): string {
    if (!bytes) return "—";
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  render() {
    return html`
      <h1>Storage</h1>
      ${this._task.render({
        pending: () => html`<div class="loading">Loading storage…</div>`,
        complete: (pools) => html`
          <div class="pools-grid">
            ${pools.map((s) => {
              return html`
                <div
                  class="pool-card"
                  @click=${() =>
                    navigate(
                      `/storage/${s.nodes?.split(",")[0] ?? "pve"}/${s.storage}`,
                    )}
                >
                  <div class="pool-header">
                    <span class="pool-name">${s.storage}</span>
                    <span class="pool-type">${s.type}</span>
                  </div>
                  <div class="pool-donut">
                    <pxa-usage-donut
                      .used=${s.used ?? 0}
                      .total=${s.total ?? 0}
                      size="96"
                    ></pxa-usage-donut>
                  </div>
                  <div class="pool-meta">
                    <div class="pool-meta-row">
                      <span>Used</span>
                      <span>${this._fmt(s.used)}</span>
                    </div>
                    <div class="pool-meta-row">
                      <span>Available</span>
                      <span>${this._fmt(s.avail)}</span>
                    </div>
                    <div class="pool-meta-row">
                      <span>Total</span>
                      <span>${this._fmt(s.total)}</span>
                    </div>
                  </div>
                  <div class="pool-content">${s.content}</div>
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
    "pxa-storage-view": StorageView;
  }
}

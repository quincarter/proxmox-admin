import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Task } from "@lit/task";
import { navigate } from "../../state/app.state.ts";
import { storageApi } from "../../app/api.ts";
import "../../components/usage-donut/usage-donut.ts";
import { StorageDetailViewStyles } from "./storage-detail-view.styles.ts";

@customElement("pxa-storage-detail-view")
export class StorageDetailView extends LitElement {
  @property({ type: String }) node = "";
  @property({ type: String }) storageId = "";

  private _task = new Task(this, {
    task: ([node, storageId]) =>
      storageApi.getDetail(node as string, storageId as string),
    args: () => [this.node, this.storageId],
  });

  static styles: CSSResultOrNative[] = [StorageDetailViewStyles];

  private _fmt(bytes?: number): string {
    if (!bytes) return "—";
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  private _ageStr(ctime?: number): string {
    if (!ctime) return "—";
    const s = Math.floor(Date.now() / 1000) - ctime;
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  render() {
    return html`
      <button class="back-btn" @click=${() => navigate("/storage")}>
        ← Back to Storage
      </button>
      ${this._task.render({
        pending: () => html`<div class="loading">Loading storage…</div>`,
        complete: (detail) => {
          const usageFrac =
            detail.usage ??
            (detail.used && detail.total
              ? detail.used / detail.total
              : undefined);
          return html`
            <div class="title-row">
              <h1>${detail.storage}</h1>
              <span class="type-chip">${detail.type}</span>
            </div>
            <div class="layout">
              <div>
                <div class="panel">
                  <p class="panel-title">Usage</p>
                  <div class="donut-center">
                    <pxa-usage-donut
                      .used=${detail.used ?? 0}
                      .total=${detail.total ?? 0}
                      size="120"
                    ></pxa-usage-donut>
                  </div>
                  <div class="meta-grid">
                    <span class="meta-label">Used</span>
                    <span class="meta-value">${this._fmt(detail.used)}</span>
                    <span class="meta-label">Available</span>
                    <span class="meta-value">${this._fmt(detail.avail)}</span>
                    <span class="meta-label">Total</span>
                    <span class="meta-value">${this._fmt(detail.total)}</span>
                    ${usageFrac != null
                      ? html`
                          <span class="meta-label">Usage</span>
                          <span class="meta-value"
                            >${(usageFrac * 100).toFixed(1)}%</span
                          >
                        `
                      : ""}
                  </div>
                </div>
                <div class="panel" style="margin-top:var(--space-4)">
                  <p class="panel-title">Info</p>
                  <div class="meta-grid">
                    <span class="meta-label">Node</span>
                    <span class="meta-value">${detail.node}</span>
                    <span class="meta-label">Content</span>
                    <span class="meta-value">${detail.content}</span>
                    <span class="meta-label">Shared</span>
                    <span class="meta-value"
                      >${detail.shared ? "Yes" : "No"}</span
                    >
                    <span class="meta-label">Status</span>
                    <span class="meta-value">${detail.status ?? "—"}</span>
                  </div>
                </div>
              </div>
              <div class="panel">
                <p class="panel-title">
                  Volumes (${detail.volumes?.length ?? 0})
                </p>
                ${!detail.volumes?.length
                  ? html`<div class="empty">No volume data available.</div>`
                  : html`
                      <table>
                        <thead>
                          <tr>
                            <th>Volume ID</th>
                            <th>Content</th>
                            <th>Format</th>
                            <th>Size</th>
                            <th>VMID</th>
                            <th>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${detail.volumes.map(
                            (v) => html`
                              <tr>
                                <td class="mono">${v.volid}</td>
                                <td>
                                  <span class="content-type">${v.content}</span>
                                </td>
                                <td class="mono">${v.format ?? "—"}</td>
                                <td class="mono">${this._fmt(v.size)}</td>
                                <td class="mono">${v.vmid ?? "—"}</td>
                                <td class="mono">${this._ageStr(v.ctime)}</td>
                              </tr>
                            `,
                          )}
                        </tbody>
                      </table>
                    `}
              </div>
            </div>
          `;
        },
        error: (e) => html`<div class="error">Error: ${String(e)}</div>`,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-storage-detail-view": StorageDetailView;
  }
}

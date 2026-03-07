import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import {
  session,
  isAuthenticated,
  currentRoute,
  toasts,
} from "../state/app.state.ts";
import "./nav-rail.ts";
import "./status-badge.ts";

// Lazy-load view modules
async function loadView(route: string) {
  switch (route) {
    case "login":
      await import("../features/auth/login-view.ts");
      break;
    case "dashboard":
      await import("../features/dashboard/dashboard-view.ts");
      break;
    case "nodes":
      await import("../features/nodes/nodes-view.ts");
      break;
    case "lxc":
      await import("../features/lxc/lxc-view.ts");
      break;
    case "storage":
      await import("../features/storage/storage-view.ts");
      break;
  }
}

@customElement("pxa-app")
export class App extends SignalWatcher(LitElement) {
  @state() private _viewLoaded = false;

  static styles = css`
    :host {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg-base);
    }

    .authenticated-layout {
      display: flex;
      flex: 1;
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      min-height: 100vh;
    }

    .header {
      height: var(--header-height, 52px);
      display: flex;
      align-items: center;
      padding: 0 var(--space-6);
      background: var(--color-bg-elevated);
      border-bottom: 1px solid var(--color-bg-overlay);
      gap: var(--space-4);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .header-breadcrumb {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--color-text-primary);
      text-transform: capitalize;
    }

    .header-server {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .view-host {
      padding: var(--space-2) 0;
    }

    /* Toast container */
    .toast-stack {
      position: fixed;
      bottom: var(--space-6);
      right: var(--space-6);
      display: flex;
      flex-direction: column-reverse;
      gap: var(--space-2);
      z-index: 1000;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      box-shadow: var(--shadow-lg);
      animation: toast-in var(--duration-normal) var(--ease-spring);
      pointer-events: auto;
      max-width: 360px;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .toast-success {
      background: var(--color-success-bg);
      color: var(--color-success);
      border: 1px solid var(--color-success);
    }
    .toast-error {
      background: var(--color-danger-bg);
      color: var(--color-danger);
      border: 1px solid var(--color-danger);
    }
    .toast-warning {
      background: var(--color-warning-bg);
      color: var(--color-warning);
      border: 1px solid var(--color-warning);
    }
    .toast-info {
      background: var(--color-info-bg);
      color: var(--color-info);
      border: 1px solid var(--color-info);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this._loadCurrentView();
  }

  private async _loadCurrentView() {
    this._viewLoaded = false;
    await loadView(currentRoute.value);
    this._viewLoaded = true;
  }

  private _renderView() {
    if (!this._viewLoaded) {
      return html`<div
        style="padding:var(--space-6);color:var(--color-text-muted)"
      >
        Loading…
      </div>`;
    }
    switch (currentRoute.value) {
      case "login":
        return html`<pxa-login-view></pxa-login-view>`;
      case "dashboard":
        return html`<pxa-dashboard-view></pxa-dashboard-view>`;
      case "nodes":
        return html`<pxa-nodes-view></pxa-nodes-view>`;
      case "lxc":
        return html`<pxa-lxc-view></pxa-lxc-view>`;
      case "storage":
        return html`<pxa-storage-view></pxa-storage-view>`;
      default:
        return html`<div style="padding:var(--space-6)">Not found</div>`;
    }
  }

  override updated(changed: Map<string, unknown>) {
    super.updated(changed);
  }

  // React to route changes
  override willUpdate() {
    // preact signals subscription triggers re-render automatically via SignalWatcher
    const unused = currentRoute.value;
    void unused;
    this._loadCurrentView();
  }

  render() {
    const authenticated = isAuthenticated.value;

    return html`
      ${authenticated
        ? html`
            <div class="authenticated-layout">
              <pxa-nav-rail .activeRoute=${currentRoute.value}></pxa-nav-rail>
              <div class="main-content">
                <div class="header">
                  <span class="header-breadcrumb"
                    >${currentRoute.value.replace("-", " ")}</span
                  >
                  ${session.value
                    ? html`
                        <div class="header-server">
                          <pxa-status-badge status="online"></pxa-status-badge>
                          ${session.value.server.label} —
                          ${session.value.username}@${session.value.realm}
                        </div>
                      `
                    : nothing}
                </div>
                <div class="view-host">${this._renderView()}</div>
              </div>
            </div>
          `
        : html`${this._renderView()}`}

      <div class="toast-stack">
        ${toasts.value.map(
          (t) =>
            html`<div class="toast toast-${t.type}" role="status">
              ${t.message}
            </div>`,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-app": App;
  }
}

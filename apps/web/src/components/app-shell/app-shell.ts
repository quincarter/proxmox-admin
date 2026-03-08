import { LitElement, html, nothing, type CSSResultOrNative } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { Router } from "@lit-labs/router";
import {
  session,
  isAuthenticated,
  navigate,
  toasts,
} from "../../state/app.state.ts";
import { authApi } from "../../app/api.ts";
import { connectEventStream, sseStatus } from "../../app/event-stream.ts";
import "../nav-rail/nav-rail.ts";
import "../status-badge/status-badge.ts";
import { AppShellStyles } from "./app-shell.styles.ts";

/** Key used to remember the URL a user tried to access before login. */
const INTENDED_KEY = "pxa-intended-path";

@customElement("pxa-app")
export class App extends SignalWatcher(LitElement) {
  @state() private _booting = true;

  static styles: CSSResultOrNative[] = [AppShellStyles];

  // ── Router ──────────────────────────────────────────────────────────────────
  // Routes are lazily loaded via enter() so each bundle only loads on demand.

  private _router = new Router(this, [
    // Public
    {
      path: "/login",
      render: () => html`<pxa-login-view></pxa-login-view>`,
      enter: async () => {
        await import("../../features/auth/login-view.ts");
        return true;
      },
    },

    // Dashboard
    {
      path: "/",
      render: () => html`<pxa-dashboard-view></pxa-dashboard-view>`,
      enter: async () => {
        await import("../../features/dashboard/dashboard-view.ts");
        // Canonical URL is /dashboard — redirect away from bare /
        navigate("/dashboard");
        return false;
      },
    },
    {
      path: "/dashboard",
      render: () => html`<pxa-dashboard-view></pxa-dashboard-view>`,
      enter: async () => {
        await import("../../features/dashboard/dashboard-view.ts");
        return true;
      },
    },

    // Nodes
    {
      path: "/nodes",
      render: () => html`<pxa-nodes-view></pxa-nodes-view>`,
      enter: async () => {
        await import("../../features/nodes/nodes-view.ts");
        return true;
      },
    },
    {
      path: "/nodes/:node",
      render: ({ node }) =>
        html`<pxa-node-detail-view .node=${node ?? ""}></pxa-node-detail-view>`,
      enter: async () => {
        await import("../../features/node-detail/node-detail-view.ts");
        return true;
      },
    },

    // LXC
    {
      path: "/lxc",
      render: () => html`<pxa-lxc-view></pxa-lxc-view>`,
      enter: async () => {
        await import("../../features/lxc/lxc-view.ts");
        return true;
      },
    },
    {
      path: "/lxc/:node/:vmid",
      render: ({ node, vmid }) =>
        html`<pxa-lxc-detail-view
          .node=${node ?? ""}
          .vmid=${Number(vmid ?? 0)}
        ></pxa-lxc-detail-view>`,
      enter: async () => {
        await import("../../features/lxc-detail/lxc-detail-view.ts");
        return true;
      },
    },

    // VMs
    {
      path: "/vm",
      render: () => html`<pxa-vm-view></pxa-vm-view>`,
      enter: async () => {
        await import("../../features/vm/vm-view.ts");
        return true;
      },
    },
    {
      path: "/vm/:node/:vmid",
      render: ({ node, vmid }) =>
        html`<pxa-vm-detail-view
          .node=${node ?? ""}
          .vmid=${Number(vmid ?? 0)}
        ></pxa-vm-detail-view>`,
      enter: async () => {
        await import("../../features/vm-detail/vm-detail-view.ts");
        return true;
      },
    },

    // SSH terminal popup (standalone pop-out window)
    {
      path: "/ssh-terminal/:sessionId",
      render: ({ sessionId }) =>
        html`<pxa-ssh-popup .sessionId=${sessionId ?? ""}></pxa-ssh-popup>`,
      enter: async () => {
        await import("../../features/ssh-popup/ssh-popup.ts");
        return true;
      },
    },

    // Storage
    {
      path: "/storage",
      render: () => html`<pxa-storage-view></pxa-storage-view>`,
      enter: async () => {
        await import("../../features/storage/storage-view.ts");
        return true;
      },
    },
    {
      path: "/storage/:node/:storageId",
      render: ({ node, storageId }) =>
        html`<pxa-storage-detail-view
          .node=${node ?? ""}
          .storageId=${storageId ?? ""}
        ></pxa-storage-detail-view>`,
      enter: async () => {
        await import("../../features/storage-detail/storage-detail-view.ts");
        return true;
      },
    },
  ]);

  // ── Boot ────────────────────────────────────────────────────────────────────

  override connectedCallback() {
    super.connectedCallback();
    void this._boot();
  }

  private async _boot() {
    try {
      const s = await authApi.getSession();
      session.value = {
        username: s.username,
        realm: s.realm,
        server: s.server,
        expiresAt: s.expiresAt,
      };
      connectEventStream();
      // Stay on whatever URL the user requested; redirect bare / → /dashboard
      const path = location.pathname;
      if (path === "/" || path === "") {
        navigate("/dashboard");
      }
    } catch {
      // Save the intended deep-link so login can restore it
      const intended = location.pathname;
      if (intended !== "/login" && intended !== "/" && intended !== "") {
        sessionStorage.setItem(INTENDED_KEY, intended + location.search);
      }
      navigate("/login");
    } finally {
      this._booting = false;
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  private _breadcrumb(): string {
    const parts = location.pathname.split("/").filter(Boolean);
    if (!parts.length) return "Dashboard";
    return parts[0].replace(/-/g, " ");
  }

  render() {
    if (this._booting) {
      return html`<div
        style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--color-bg-base);color:var(--color-text-muted);font-size:var(--text-sm)"
      >
        Connecting…
      </div>`;
    }

    const authenticated = isAuthenticated.value;
    const view = this._router.outlet();

    return html`
      ${authenticated
        ? html`
            <div class="authenticated-layout">
              <pxa-nav-rail .activePath=${location.pathname}></pxa-nav-rail>
              <div class="main-content">
                <div class="header">
                  <span class="header-breadcrumb">${this._breadcrumb()}</span>
                  ${session.value
                    ? html`
                        <div class="header-server">
                          <pxa-status-badge status="online"></pxa-status-badge>
                          ${session.value.server.label} —
                          ${session.value.username}@${session.value.realm}
                        </div>
                        <div
                          class="sse-indicator sse-${sseStatus.value}"
                          title="Realtime stream: ${sseStatus.value}"
                        ></div>
                      `
                    : nothing}
                </div>
                <div class="view-host">${view}</div>
              </div>
            </div>
          `
        : view}

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

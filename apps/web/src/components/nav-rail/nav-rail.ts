import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property } from "lit/decorators.js";
import { clearSession, addToast, navigate } from "../../state/app.state.ts";
import { authApi } from "../../app/api.ts";
import { NavRailStyles } from "./nav-rail.styles.ts";

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", icon: "⬛", label: "Overview" },
  { path: "/nodes", icon: "🖥", label: "Nodes" },
  { path: "/lxc", icon: "📦", label: "Containers" },
  { path: "/vm", icon: "🖥️", label: "VMs" },
  { path: "/storage", icon: "💾", label: "Storage" },
];

@customElement("pxa-nav-rail")
export class NavRail extends LitElement {
  /** Current browser pathname — passed from app-shell after each navigation. */
  @property() activePath = "/dashboard";

  static styles: CSSResultOrNative[] = [NavRailStyles];

  private _isActive(item: NavItem): boolean {
    // /dashboard exact; all others match prefix so /nodes/pve is still "Nodes"
    if (item.path === "/dashboard")
      return this.activePath === "/dashboard" || this.activePath === "/";
    return this.activePath.startsWith(item.path);
  }

  private async _logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearSession();
    addToast("info", "Logged out");
  }

  render() {
    return html`
      <div class="rail-top">
        <div class="logo">⚡</div>
      </div>

      <nav>
        ${NAV_ITEMS.map(
          (item) => html`
            <button
              class="nav-item ${this._isActive(item) ? "active" : ""}"
              @click=${() => navigate(item.path)}
              title=${item.label}
              aria-label=${item.label}
              aria-current=${this._isActive(item) ? "page" : "false"}
            >
              <span class="nav-icon">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `,
        )}
      </nav>

      <div class="rail-bottom">
        <button
          class="logout-btn"
          @click=${this._logout}
          title="Log out"
          aria-label="Log out"
        >
          <span class="nav-icon">↩</span>
          <span>Logout</span>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-nav-rail": NavRail;
  }
}

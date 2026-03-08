import { LitElement, html, nothing, type CSSResultOrNative } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authApi, ApiError } from "../../app/api.ts";
import { session, navigate, addToast } from "../../state/app.state.ts";
import type { ServerConnection } from "@proxmox-admin/types";
import { LoginViewStyles } from "./login-view.styles.ts";

@customElement("pxa-login-view")
export class LoginView extends LitElement {
  @state() private _host = "";
  @state() private _port = "8006";
  @state() private _username = "root";
  @state() private _password = "";
  @state() private _realm = "pam";
  @state() private _tlsMode: "system" | "self-signed" | "insecure" = "system";
  @state() private _saveServer = true;
  @state() private _loading = false;
  @state() private _error: string | null = null;

  static styles: CSSResultOrNative[] = [LoginViewStyles];

  private async _handleSubmit(e: Event) {
    e.preventDefault();
    this._error = null;
    this._loading = true;

    try {
      const result = await authApi.login({
        host: this._host,
        port: parseInt(this._port, 10),
        username: this._username,
        password: this._password,
        realm: this._realm,
        tlsMode: this._tlsMode,
        saveServer: this._saveServer,
        label: this._host,
      });

      session.value = {
        username: result.username,
        realm: result.realm,
        server: result.server as ServerConnection,
        expiresAt: result.expiresAt,
      };
      // Restore the URL the user was trying to reach before being sent to login
      const intended =
        sessionStorage.getItem("pxa-intended-path") ?? "/dashboard";
      sessionStorage.removeItem("pxa-intended-path");
      navigate(intended);
      addToast("success", `Connected to ${result.server.label}`);
    } catch (err) {
      if (err instanceof ApiError) {
        this._error = err.message;
      } else {
        this._error = "Unable to connect. Check the host and try again.";
      }
    } finally {
      this._loading = false;
    }
  }

  render() {
    return html`
      <div class="card">
        <div class="brand">
          <div class="brand-icon">⚡</div>
          <div>
            <div class="brand-title">Proxmox Admin</div>
            <div class="brand-sub">Administration Console</div>
          </div>
        </div>

        ${this._error
          ? html`<div class="error" role="alert">${this._error}</div>`
          : nothing}

        <form @submit=${this._handleSubmit} novalidate>
          <div class="form-group">
            <label for="host">Proxmox Host</label>
            <div class="row">
              <input
                id="host"
                type="text"
                placeholder="192.168.1.10"
                .value=${this._host}
                @input=${(e: InputEvent) =>
                  (this._host = (e.target as HTMLInputElement).value)}
                autocomplete="off"
                spellcheck="false"
                required
              />
              <input
                type="number"
                placeholder="8006"
                .value=${this._port}
                @input=${(e: InputEvent) =>
                  (this._port = (e.target as HTMLInputElement).value)}
                style="width:80px"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              type="text"
              .value=${this._username}
              @input=${(e: InputEvent) =>
                (this._username = (e.target as HTMLInputElement).value)}
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              .value=${this._password}
              @input=${(e: InputEvent) =>
                (this._password = (e.target as HTMLInputElement).value)}
              autocomplete="current-password"
              required
            />
          </div>

          <div class="form-group">
            <label for="realm">Realm</label>
            <select
              id="realm"
              .value=${this._realm}
              @change=${(e: Event) =>
                (this._realm = (e.target as HTMLSelectElement).value)}
            >
              <option value="pam">PAM (Linux)</option>
              <option value="pve">PVE (Proxmox)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="tls">TLS Mode</label>
            <select
              id="tls"
              .value=${this._tlsMode}
              @change=${(e: Event) =>
                (this._tlsMode = (e.target as HTMLSelectElement)
                  .value as typeof this._tlsMode)}
            >
              <option value="system">Trusted CA (recommended)</option>
              <option value="self-signed">Self-signed (accept)</option>
              <option value="insecure">Insecure (skip verification)</option>
            </select>
          </div>

          <div class="divider"></div>

          <label class="check-row">
            <input
              type="checkbox"
              .checked=${this._saveServer}
              @change=${(e: Event) =>
                (this._saveServer = (e.target as HTMLInputElement).checked)}
            />
            Remember this server
          </label>

          <button
            type="submit"
            class="btn-primary"
            ?disabled=${this._loading || !this._host || !this._password}
          >
            ${this._loading ? "Connecting…" : "Connect"}
          </button>
        </form>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-login-view": LoginView;
  }
}

import { LitElement, html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { authApi, ApiError } from "../../app/api.ts";
import { session, currentRoute, addToast } from "../../state/app.state.ts";
import type { ServerConnection } from "@proxmox-admin/types";

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

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--color-bg-base);
      padding: var(--space-4);
    }

    .card {
      background: var(--color-bg-elevated);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      padding: var(--space-8);
      width: 100%;
      max-width: 400px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-8);
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      background: var(--color-brand);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .brand-title {
      font-size: var(--text-xl);
      font-weight: var(--weight-bold);
      color: var(--color-text-primary);
      line-height: 1.2;
    }
    .brand-sub {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .form-group {
      margin-bottom: var(--space-4);
    }
    label {
      display: block;
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--color-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: var(--space-1);
    }
    input,
    select {
      width: 100%;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-bg-overlay);
      border-radius: var(--radius-sm);
      color: var(--color-text-primary);
      font-size: var(--text-sm);
      font-family: var(--font-sans);
      padding: var(--space-2) var(--space-3);
      outline: none;
      transition: border-color var(--duration-fast);
      box-sizing: border-box;
    }
    input:focus,
    select:focus {
      border-color: var(--color-brand);
    }
    select option {
      background: var(--color-bg-elevated);
    }

    .row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-2);
    }
    .row input:first-child {
      min-width: 0;
    }

    .check-row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      cursor: pointer;
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .check-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: var(--color-brand);
    }

    .error {
      background: var(--color-danger-bg);
      border: 1px solid var(--color-danger);
      border-radius: var(--radius-sm);
      color: var(--color-danger);
      font-size: var(--text-sm);
      padding: var(--space-2) var(--space-3);
      margin-bottom: var(--space-4);
    }

    .btn-primary {
      width: 100%;
      padding: var(--space-3);
      background: var(--color-brand);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      font-family: var(--font-sans);
      cursor: pointer;
      transition: background var(--duration-fast);
      margin-top: var(--space-2);
    }
    .btn-primary:hover:not(:disabled) {
      background: var(--color-brand-hover);
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .divider {
      height: 1px;
      background: var(--color-bg-overlay);
      margin: var(--space-4) 0;
    }
  `;

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
      currentRoute.value = "dashboard";
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

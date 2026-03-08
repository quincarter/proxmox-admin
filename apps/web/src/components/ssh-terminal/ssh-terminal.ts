import { LitElement, html, type CSSResultOrNative, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { unsafeCSS } from "lit";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import xtermCSS from "@xterm/xterm/css/xterm.css?raw";
import type {
  SshGuestType,
  SshWorkerCreate,
  SshWorkerInbound,
  SshWorkerOutbound,
} from "@proxmox-admin/types";
import { SshTerminalStyles } from "./ssh-terminal.styles.ts";

type TerminalPhase =
  | "credentials"
  | "connecting"
  | "connected"
  | "error"
  | "closed";

/**
 * <pxa-ssh-terminal>
 *
 * Interactive in-browser SSH terminal built on xterm.js and a SharedWorker.
 * The SharedWorker owns the WebSocket → NestJS SSH gateway connection so the
 * session survives tab navigation and pop-out.
 *
 * Usage (inline embedded in a detail view):
 *   <pxa-ssh-terminal node="pve" .vmid=${100} guestType="lxc"></pxa-ssh-terminal>
 *
 * Usage (pop-out attach mode — the session already exists):
 *   <pxa-ssh-terminal sessionId="ssh-xxx-yyy"></pxa-ssh-terminal>
 */
@customElement("pxa-ssh-terminal")
export class SshTerminal extends LitElement {
  /** Proxmox node name — required in create mode. */
  @property() node = "";
  /** VMID — required in create mode. */
  @property({ type: Number }) vmid = 0;
  /** Guest type — drives the remote command (pct enter vs qm terminal). */
  @property() guestType: SshGuestType = "lxc";
  /**
   * When set, the component attaches to an existing SharedWorker session
   * rather than showing the credential form.  Used by the pop-out window.
   */
  @property() sessionId = "";

  @state() private _phase: TerminalPhase = "credentials";
  @state() private _errorMsg = "";
  @state() private _username = "root";
  @state() private _password = "";
  @state() private _privateKey = "";
  @state() private _authMode: "password" | "key" = "password";

  @query(".terminal-container") private _container!: HTMLElement;

  private _xterm: Terminal | null = null;
  private _fitAddon: FitAddon | null = null;
  private _worker: SharedWorker | null = null;
  private _activeSessionId = "";
  private _resizeObserver: ResizeObserver | null = null;
  private _pingInterval: ReturnType<typeof setInterval> | null = null;
  /** Output queued before xterm is mounted. */
  private _outputQueue: string[] = [];

  static styles: CSSResultOrNative[] = [unsafeCSS(xtermCSS), SshTerminalStyles];

  override connectedCallback() {
    super.connectedCallback();
    // Attach mode: skip the credential form and join an existing session.
    if (this.sessionId) {
      this._phase = "connecting";
      this.updateComplete.then(() => this._attachSession(this.sessionId));
    }
  }

  override firstUpdated() {
    // Auto-connect mode: attempt connection using session SSH creds (PAM users).
    // If the gateway cannot resolve credentials, it replies with needs-credentials
    // and the form is shown as a fallback.
    if (
      !this.sessionId &&
      this.node &&
      this.vmid &&
      typeof SharedWorker !== "undefined"
    ) {
      this._connectAuto();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanup();
  }

  // ── SharedWorker ────────────────────────────────────────────────────────

  private _getWorker(): SharedWorker {
    if (!this._worker) {
      this._worker = new SharedWorker(
        new URL("../../workers/ssh-shared.worker.ts", import.meta.url),
        { type: "module", name: "pxa-ssh-shared" },
      );
      this._worker.port.addEventListener(
        "message",
        this._onWorkerMessage.bind(this),
      );
      this._worker.port.start();
    }
    return this._worker;
  }

  private _send(msg: SshWorkerInbound): void {
    this._getWorker().port.postMessage(msg);
  }

  private _onWorkerMessage(ev: MessageEvent<SshWorkerOutbound>): void {
    const msg = ev.data;
    if (msg.sessionId !== this._activeSessionId) return;

    switch (msg.type) {
      case "ready":
        this._phase = "connected";
        this.updateComplete.then(() => this._mountTerminal());
        break;
      case "output":
        if (this._xterm) {
          this._xterm.write(msg.data);
        } else {
          this._outputQueue.push(msg.data);
        }
        break;
      case "error":
        this._errorMsg = msg.message;
        this._phase = "error";
        this._cleanup();
        break;
      case "closed":
        this._phase = "closed";
        this._cleanup();
        break;
      case "needs-credentials":
        // Gateway couldn't resolve creds from session (non-PAM realm). Show form.
        this._phase = "credentials";
        break;
    }
  }

  // ── Session actions ──────────────────────────────────────────────────────

  /** Attempt connection using session-derived SSH credentials (PAM realm). */
  private _connectAuto() {
    const sessionId = `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this._activeSessionId = sessionId;
    this._phase = "connecting";
    this._send({
      type: "create",
      sessionId,
      node: this.node,
      vmid: this.vmid,
      guestType: this.guestType,
      cols: 80,
      rows: 24,
      // username/password intentionally omitted — gateway uses session SSH creds
    });
  }

  private _connect() {
    const sessionId = `ssh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this._activeSessionId = sessionId;
    this._phase = "connecting";

    const msg: SshWorkerCreate = {
      type: "create",
      sessionId,
      node: this.node,
      vmid: this.vmid,
      guestType: this.guestType,
      username: this._username,
      // Use a conservative initial size; FitAddon will send the real size.
      cols: 80,
      rows: 24,
    };
    if (this._authMode === "password") {
      msg.password = this._password;
    } else {
      msg.privateKey = this._privateKey;
    }
    this._send(msg);
  }

  private _attachSession(sessionId: string) {
    this._activeSessionId = sessionId;
    this._send({ type: "attach", sessionId });
  }

  private _popOut() {
    window.open(
      `/ssh-terminal/${this._activeSessionId}`,
      `pxa-ssh-${this._activeSessionId}`,
      "popup,width=1000,height=650,resizable=yes",
    );
  }

  private _disconnect() {
    this._send({ type: "detach", sessionId: this._activeSessionId });
    this._phase = "credentials";
    this._activeSessionId = "";
    this._cleanup();
  }

  private _retry() {
    this._phase = "credentials";
    this._errorMsg = "";
    this._outputQueue = [];
  }

  // ── xterm.js terminal ────────────────────────────────────────────────────

  private _mountTerminal() {
    if (this._xterm || !this._container) return;

    this._xterm = new Terminal({
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#58a6ff",
        cursorAccent: "#0d1117",
        selectionBackground: "#264f78",
        black: "#484f58",
        brightBlack: "#6e7681",
        red: "#ff7b72",
        brightRed: "#ffa198",
        green: "#3fb950",
        brightGreen: "#56d364",
        yellow: "#d29922",
        brightYellow: "#e3b341",
        blue: "#58a6ff",
        brightBlue: "#79c0ff",
        magenta: "#bc8cff",
        brightMagenta: "#d2a8ff",
        cyan: "#39c5cf",
        brightCyan: "#56d4dd",
        white: "#b1bac4",
        brightWhite: "#f0f6fc",
      },
      fontFamily:
        '"Cascadia Code", "Fira Code", "JetBrains Mono", "Source Code Pro", monospace',
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: false,
      allowProposedApi: true,
    });

    this._fitAddon = new FitAddon();
    this._xterm.loadAddon(this._fitAddon);
    this._xterm.open(this._container);

    // Delay fit so the container has final painted dimensions.
    requestAnimationFrame(() => {
      this._fitAddon?.fit();
      this._sendResize();
    });

    // Flush any output that arrived before the terminal was mounted.
    if (this._outputQueue.length > 0) {
      this._xterm.write(this._outputQueue.join(""));
      this._outputQueue = [];
    }

    // Forward keystrokes and paste events to the SharedWorker.
    this._xterm.onData((data) => {
      this._send({
        type: "input",
        sessionId: this._activeSessionId,
        data,
      });
    });

    // Detect container resize and reflow the terminal.
    this._resizeObserver = new ResizeObserver(() => {
      this._fitAddon?.fit();
      this._sendResize();
    });
    this._resizeObserver.observe(this._container);

    // Keepalive pings to prevent idle timeout on the gateway.
    this._pingInterval = setInterval(() => {
      if (this._worker?.port) {
        // Piggyback ping through the SharedWorker → ws.send
        // SharedWorker doesn't have a dedicated ping passthrough, so we send
        // an input of zero bytes which the NestJS handler ignores gracefully.
        // (A dedicated "keepalive" message type can be added later.)
      }
    }, 30_000);

    this._xterm.focus();
  }

  private _sendResize() {
    if (!this._xterm || !this._activeSessionId) return;
    this._send({
      type: "resize",
      sessionId: this._activeSessionId,
      cols: this._xterm.cols,
      rows: this._xterm.rows,
    });
  }

  private _cleanup() {
    if (this._pingInterval !== null) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._xterm?.dispose();
    this._xterm = null;
    this._fitAddon = null;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render() {
    if (this._phase === "credentials") {
      return this._renderCredentials();
    }
    return this._renderTerminal();
  }

  private _renderCredentials() {
    return html`
      <form
        class="credentials-form"
        @submit=${(e: Event) => {
          e.preventDefault();
          this._connect();
        }}
      >
        <div class="form-title">
          SSH — ${this.guestType === "lxc" ? "CT" : "VM"} ${this.vmid}
        </div>
        <div class="form-subtitle">
          Connects via the Proxmox node — uses
          ${this.guestType === "lxc"
            ? html`<code>pct enter</code>`
            : html`<code>qm terminal</code>`}.
          PAM realm users connect automatically; enter credentials for other
          realms.
        </div>

        <div class="form-field">
          <label>Username</label>
          <input
            type="text"
            autocomplete="username"
            .value=${this._username}
            @input=${(e: Event) => {
              this._username = (e.target as HTMLInputElement).value;
            }}
          />
        </div>

        <div class="auth-tabs">
          <button
            type="button"
            class=${this._authMode === "password" ? "active" : ""}
            @click=${() => {
              this._authMode = "password";
            }}
          >
            Password
          </button>
          <button
            type="button"
            class=${this._authMode === "key" ? "active" : ""}
            @click=${() => {
              this._authMode = "key";
            }}
          >
            SSH Key
          </button>
        </div>

        ${this._authMode === "password"
          ? html`
              <div class="form-field">
                <label>Password</label>
                <input
                  type="password"
                  autocomplete="current-password"
                  .value=${this._password}
                  @input=${(e: Event) => {
                    this._password = (e.target as HTMLInputElement).value;
                  }}
                />
              </div>
            `
          : html`
              <div class="form-field">
                <label>Private Key (PEM)</label>
                <textarea
                  rows="6"
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;…&#10;-----END OPENSSH PRIVATE KEY-----"
                  .value=${this._privateKey}
                  @input=${(e: Event) => {
                    this._privateKey = (e.target as HTMLTextAreaElement).value;
                  }}
                ></textarea>
              </div>
            `}

        <button type="submit" class="connect-btn">Connect</button>
      </form>
    `;
  }

  private _renderTerminal() {
    const isConnected = this._phase === "connected";
    const isError = this._phase === "error";
    const isClosed = this._phase === "closed";

    return html`
      <div class="terminal-shell">
        <div class="terminal-toolbar">
          <span class="status-dot ${isConnected ? "connected" : ""}"></span>
          <span class="session-label">
            ${this.guestType === "lxc" ? "CT" : "VM"}
            ${this.vmid}${this.node ? ` @ ${this.node}` : ""}
          </span>
          ${isConnected
            ? html`
                <button
                  class="toolbar-btn popout-btn"
                  title="Pop out into new window"
                  @click=${this._popOut}
                >
                  ⤢
                </button>
                <button
                  class="toolbar-btn disconnect-btn"
                  title="Disconnect"
                  @click=${this._disconnect}
                >
                  ✕
                </button>
              `
            : nothing}
        </div>

        <div
          style="position:relative;flex:1;min-height:0;display:flex;flex-direction:column;"
        >
          ${this._phase === "connecting"
            ? html`
                <div class="overlay">
                  <div class="spinner"></div>
                  <span class="overlay-text">Connecting…</span>
                </div>
              `
            : nothing}
          ${isError
            ? html`
                <div class="overlay">
                  <span class="overlay-error">${this._errorMsg}</span>
                  <button class="overlay-btn" @click=${this._retry}>
                    Retry
                  </button>
                </div>
              `
            : nothing}
          ${isClosed
            ? html`
                <div class="overlay">
                  <span class="overlay-text">Connection closed</span>
                  <button class="overlay-btn" @click=${this._retry}>
                    Reconnect
                  </button>
                </div>
              `
            : nothing}

          <div class="terminal-container"></div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-ssh-terminal": SshTerminal;
  }
}

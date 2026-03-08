import { LitElement, html, css, type CSSResultOrNative } from "lit";
import { customElement, property } from "lit/decorators.js";
import "../../components/ssh-terminal/ssh-terminal.ts";

/**
 * Full-screen SSH terminal popup page.
 *
 * Mounted at /ssh-terminal/:sessionId.  Retrieves the sessionId from the router
 * and passes it to <pxa-ssh-terminal> in attach mode so it joins the existing
 * SharedWorker session without re-prompting for credentials.
 */
@customElement("pxa-ssh-popup")
export class SshPopup extends LitElement {
  /** Session ID passed by the router from the URL path. */
  @property() sessionId = "";

  static styles: CSSResultOrNative[] = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        width: 100vw;
        height: 100dvh;
        background: #0d1117;
        overflow: hidden;
      }

      pxa-ssh-terminal {
        flex: 1;
        min-height: 0;
      }

      .not-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 8px;
        color: #8b949e;
        font-size: 14px;
      }
    `,
  ];

  render() {
    if (!this.sessionId) {
      return html`<div class="not-found">No session ID provided.</div>`;
    }

    // Decode optional vmid / type metadata from URL search params set by the opener.
    const params = new URLSearchParams(window.location.search);
    const vmid = Number(params.get("vmid") ?? 0);
    const guestType = (params.get("type") as "lxc" | "qemu" | null) ?? "lxc";

    return html`
      <pxa-ssh-terminal
        .sessionId=${this.sessionId}
        .vmid=${vmid}
        .guestType=${guestType}
      ></pxa-ssh-terminal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-ssh-popup": SshPopup;
  }
}

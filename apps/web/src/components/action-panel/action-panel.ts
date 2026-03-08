import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ActionPanelStyles } from "./action-panel.styles.ts";
import { guestsApi } from "../../app/api.ts";
import { addToast } from "../../state/app.state.ts";
import type { GuestStatus, GuestAction } from "@proxmox-admin/types";

interface ActionDef {
  action: GuestAction;
  label: string;
  variant: "primary" | "danger" | "muted";
  /** Guest statuses where this action is available */
  when: GuestStatus[];
}

const ACTIONS: ActionDef[] = [
  { action: "start", label: "Start", variant: "primary", when: ["stopped"] },
  {
    action: "stop",
    label: "Stop",
    variant: "danger",
    when: ["running", "paused", "suspended"],
  },
  {
    action: "shutdown",
    label: "Shutdown",
    variant: "muted",
    when: ["running"],
  },
  { action: "reboot", label: "Reboot", variant: "muted", when: ["running"] },
  { action: "suspend", label: "Suspend", variant: "muted", when: ["running"] },
  {
    action: "resume",
    label: "Resume",
    variant: "primary",
    when: ["paused", "suspended"],
  },
  { action: "reset", label: "Reset", variant: "danger", when: ["running"] },
];

/**
 * Guest action button panel.
 * Fires 'action-done' custom event with { upid } on success, updates status.
 */
@customElement("pxa-action-panel")
export class ActionPanel extends LitElement {
  @property({ type: String }) node = "";
  @property({ type: Number }) vmid = 0;
  @property({ type: String }) type: "lxc" | "qemu" = "lxc";
  @property({ type: String }) status: GuestStatus = "unknown";

  @state() private _busy: GuestAction | null = null;
  @state() private _confirm: GuestAction | null = null;

  static styles: CSSResultOrNative[] = [ActionPanelStyles];

  private _needsConfirm(action: GuestAction): boolean {
    return ["stop", "reset"].includes(action);
  }

  private _handleClick(action: GuestAction) {
    if (this._needsConfirm(action)) {
      this._confirm = action;
    } else {
      void this._runAction(action);
    }
  }

  private async _runAction(action: GuestAction) {
    this._confirm = null;
    this._busy = action;
    try {
      const fn =
        this.type === "lxc" ? guestsApi.lxcAction : guestsApi.qemuAction;
      const { upid } = await fn(this.node, this.vmid, action);
      addToast("success", `${action} dispatched — task ${upid.slice(0, 20)}…`);
      this.dispatchEvent(
        new CustomEvent("action-done", {
          detail: { action, upid },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      addToast("error", `Action failed: ${String(err)}`);
    } finally {
      this._busy = null;
    }
  }

  render() {
    const available = ACTIONS.filter((a) => a.when.includes(this.status));

    if (this._confirm) {
      const def = ACTIONS.find((a) => a.action === this._confirm)!;
      return html`
        <div class="confirm-strip">
          Confirm ${def.label}?
          <button
            @click=${() => this._runAction(this._confirm!)}
            ?disabled=${!!this._busy}
          >
            ${this._busy === this._confirm
              ? html`<span class="spinner"></span>`
              : ""}
            Yes, ${def.label}
          </button>
          <button class="confirm-cancel" @click=${() => (this._confirm = null)}>
            Cancel
          </button>
        </div>
      `;
    }

    return html`
      ${available.map(
        (a) => html`
          <button
            class="btn-${a.variant}"
            ?disabled=${!!this._busy}
            @click=${() => this._handleClick(a.action)}
          >
            ${this._busy === a.action
              ? html`<span class="spinner"></span>`
              : ""}
            ${a.label}
          </button>
        `,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-action-panel": ActionPanel;
  }
}

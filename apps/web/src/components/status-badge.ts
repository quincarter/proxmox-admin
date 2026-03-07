import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { GuestStatus, NodeStatus } from "@proxmox-admin/types";

type StatusValue =
  | GuestStatus
  | NodeStatus
  | "active"
  | "inactive"
  | "unknown"
  | "warning"
  | "critical"
  | "ok";

@customElement("pxa-status-badge")
export class StatusBadge extends LitElement {
  @property({ reflect: true }) status: StatusValue = "unknown";
  @property() label?: string;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    :host([status="running"]) .dot,
    :host([status="online"]) .dot,
    :host([status="active"]) .dot,
    :host([status="ok"]) .dot {
      background: var(--status-running, #23a55a);
    }

    :host([status="stopped"]) .dot,
    :host([status="offline"]) .dot,
    :host([status="inactive"]) .dot,
    :host([status="critical"]) .dot {
      background: var(--status-stopped, #f23f42);
    }

    :host([status="paused"]) .dot,
    :host([status="suspended"]) .dot,
    :host([status="warning"]) .dot {
      background: var(--status-paused, #f0b232);
    }

    :host([status="unknown"]) .dot {
      background: var(--status-unknown, #72767d);
    }

    .label {
      color: var(--color-text-secondary, #b5bac1);
    }
    :host([status="running"]) .label,
    :host([status="online"]) .label,
    :host([status="active"]) .label,
    :host([status="ok"]) .label {
      color: var(--status-running, #23a55a);
    }

    :host([status="stopped"]) .label,
    :host([status="offline"]) .label,
    :host([status="inactive"]) .label,
    :host([status="critical"]) .label {
      color: var(--status-stopped, #f23f42);
    }

    :host([status="paused"]) .label,
    :host([status="suspended"]) .label,
    :host([status="warning"]) .label {
      color: var(--status-paused, #f0b232);
    }
  `;

  render() {
    const label = this.label ?? this.status;
    return html`<span class="dot"></span><span class="label">${label}</span>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-status-badge": StatusBadge;
  }
}

import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { GuestStatus, NodeStatus } from "@proxmox-admin/types";
import { StatusBadgeStyles } from "./status-badge.styles";

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

  static styles: CSSResultOrNative[] = [StatusBadgeStyles];

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

import { LitElement, html, type CSSResultOrNative } from "lit";
import { customElement, property } from "lit/decorators.js";
import { UsageBarStyles } from "./usage-bar.styles.ts";

/**
 * Horizontal usage bar: label + fill + percentage text.
 * Usage: <pxa-usage-bar label="CPU" .fraction=${0.45} />
 */
@customElement("pxa-usage-bar")
export class UsageBar extends LitElement {
  @property({ type: String }) label = "";
  @property({ type: Number }) fraction = 0;
  @property({ type: String }) valueText = "";

  static styles: CSSResultOrNative[] = [UsageBarStyles];

  render() {
    const pct = Math.round(Math.min(this.fraction, 1) * 100);
    const cls =
      this.fraction > 0.85 ? "danger" : this.fraction > 0.65 ? "warn" : "ok";
    return html`
      <div class="row">
        ${this.label ? html`<span class="lbl">${this.label}</span>` : ""}
        <div class="track">
          <div class="fill ${cls}" style="width:${pct}%"></div>
        </div>
        <span class="val">${this.valueText || `${pct}%`}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-usage-bar": UsageBar;
  }
}

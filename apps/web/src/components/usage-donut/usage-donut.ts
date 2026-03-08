import { LitElement, html, svg, type CSSResultOrNative } from "lit";
import { customElement, property } from "lit/decorators.js";
import { UsageDonutStyles } from "./usage-donut.styles.ts";

/**
 * SVG donut ring showing used/total space.
 * Usage: <pxa-usage-donut .used=${bytes} .total=${bytes} label="local-lvm" />
 */
@customElement("pxa-usage-donut")
export class UsageDonut extends LitElement {
  @property({ type: Number }) used = 0;
  @property({ type: Number }) total = 0;
  @property({ type: String }) label = "";
  @property({ type: Number }) size = 80;

  static styles: CSSResultOrNative[] = [UsageDonutStyles];

  private _fmt(bytes: number): string {
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)}T`;
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}G`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)}M`;
    return `${bytes}B`;
  }

  render() {
    const fraction = this.total > 0 ? Math.min(this.used / this.total, 1) : 0;
    const pct = Math.round(fraction * 100);
    const r = 28;
    const cx = this.size / 2;
    const cy = this.size / 2;
    const circumference = 2 * Math.PI * r;
    const filled = circumference * fraction;
    const empty = circumference - filled;

    // Color: green → amber → red
    const strokeColor =
      fraction > 0.85
        ? "var(--color-danger)"
        : fraction > 0.65
          ? "var(--color-warning)"
          : "var(--color-success)";

    return html`
      <div
        class="donut-wrap"
        style="width:${this.size}px;height:${this.size}px"
      >
        ${svg`
          <svg width="${this.size}" height="${this.size}" viewBox="0 0 ${this.size} ${this.size}">
            <circle
              cx="${cx}" cy="${cy}" r="${r}"
              fill="none"
              stroke="var(--color-bg-overlay)"
              stroke-width="8"
            />
            <circle
              cx="${cx}" cy="${cy}" r="${r}"
              fill="none"
              stroke="${strokeColor}"
              stroke-width="8"
              stroke-linecap="round"
              stroke-dasharray="${filled} ${empty}"
              style="transition: stroke-dasharray 0.5s ease"
            />
          </svg>
        `}
        <div class="center-text">
          <span class="pct">${pct}%</span>
        </div>
      </div>
      ${this.label
        ? html`<span class="label" title=${this.label}>${this.label}</span>`
        : ""}
      ${this.total
        ? html`<span class="used-label"
            >${this._fmt(this.used)} / ${this._fmt(this.total)}</span
          >`
        : ""}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "pxa-usage-donut": UsageDonut;
  }
}

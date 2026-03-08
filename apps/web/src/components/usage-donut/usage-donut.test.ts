import { describe, it, expect, afterEach } from "vitest";
import {
  fixture,
  html,
  fixtureCleanup,
  elementUpdated,
} from "@open-wc/testing";
import "./usage-donut.ts";
import type { UsageDonut } from "./usage-donut.ts";

describe("pxa-usage-donut", () => {
  afterEach(() => fixtureCleanup());

  // ── Basic rendering ────────────────────────────────────────────────────────

  it("renders an SVG element inside the shadow root", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${0} .total=${100}></pxa-usage-donut>`,
    );
    expect(el.shadowRoot!.querySelector("svg")).not.toBeNull();
  });

  it("renders two SVG circle elements (track + fill)", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${50} .total=${100}></pxa-usage-donut>`,
    );
    const circles = el.shadowRoot!.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });

  it("renders a percentage text element", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${50} .total=${100}></pxa-usage-donut>`,
    );
    const pct = el.shadowRoot!.querySelector(".pct");
    expect(pct).not.toBeNull();
  });

  // ── Percentage display ─────────────────────────────────────────────────────

  it("shows 0% when total is 0", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${500} .total=${0}></pxa-usage-donut>`,
    );
    const pct = el.shadowRoot!.querySelector(".pct");
    expect(pct?.textContent?.trim()).toBe("0%");
  });

  it("shows 50% when used is half of total", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut
        .used=${500_000_000}
        .total=${1_000_000_000}
      ></pxa-usage-donut>`,
    );
    const pct = el.shadowRoot!.querySelector(".pct");
    expect(pct?.textContent?.trim()).toBe("50%");
  });

  it("shows 100% when used equals total", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${100} .total=${100}></pxa-usage-donut>`,
    );
    const pct = el.shadowRoot!.querySelector(".pct");
    expect(pct?.textContent?.trim()).toBe("100%");
  });

  it("clamps to 100% when used exceeds total", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${200} .total=${100}></pxa-usage-donut>`,
    );
    const pct = el.shadowRoot!.querySelector(".pct");
    expect(pct?.textContent?.trim()).toBe("100%");
  });

  it("rounds fractional percentages", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${1} .total=${3}></pxa-usage-donut>`,
    );
    // Math.round(1/3 * 100) = 33
    const pct = el.shadowRoot!.querySelector(".pct");
    expect(pct?.textContent?.trim()).toBe("33%");
  });

  // ── Stroke color by threshold ──────────────────────────────────────────────

  it("uses success color when fraction is at or below 0.65", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${60} .total=${100}></pxa-usage-donut>`,
    );
    const fillCircle = el.shadowRoot!.querySelectorAll("circle")[1];
    expect(fillCircle?.getAttribute("stroke")).toBe("var(--color-success)");
  });

  it("uses warning color when fraction is between 0.65 and 0.85", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${75} .total=${100}></pxa-usage-donut>`,
    );
    const fillCircle = el.shadowRoot!.querySelectorAll("circle")[1];
    expect(fillCircle?.getAttribute("stroke")).toBe("var(--color-warning)");
  });

  it("uses danger color when fraction is above 0.85", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${90} .total=${100}></pxa-usage-donut>`,
    );
    const fillCircle = el.shadowRoot!.querySelectorAll("circle")[1];
    expect(fillCircle?.getAttribute("stroke")).toBe("var(--color-danger)");
  });

  it("uses success color when total is 0 (fraction = 0)", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${0} .total=${0}></pxa-usage-donut>`,
    );
    const fillCircle = el.shadowRoot!.querySelectorAll("circle")[1];
    expect(fillCircle?.getAttribute("stroke")).toBe("var(--color-success)");
  });

  // ── Label ──────────────────────────────────────────────────────────────────

  it("renders a label span when label is set", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut
        .used=${50}
        .total=${100}
        label="local-lvm"
      ></pxa-usage-donut>`,
    );
    const lbl = el.shadowRoot!.querySelector(".label");
    expect(lbl?.textContent?.trim()).toBe("local-lvm");
  });

  it("does not render a label span when label is empty", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${50} .total=${100}></pxa-usage-donut>`,
    );
    expect(el.shadowRoot!.querySelector(".label")).toBeNull();
  });

  // ── Used / total display ───────────────────────────────────────────────────

  it("renders a used-label span when total > 0", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut
        .used=${1_073_741_824}
        .total=${2_147_483_648}
      ></pxa-usage-donut>`,
    );
    expect(el.shadowRoot!.querySelector(".used-label")).not.toBeNull();
  });

  it("does not render a used-label span when total is 0", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${0} .total=${0}></pxa-usage-donut>`,
    );
    expect(el.shadowRoot!.querySelector(".used-label")).toBeNull();
  });

  it("formats bytes in the used-label (GB range)", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut
        .used=${1_073_741_824}
        .total=${2_147_483_648}
      ></pxa-usage-donut>`,
    );
    const lbl = el.shadowRoot!.querySelector(".used-label");
    // 1073741824 bytes = 1.0G, 2147483648 = 2.0G
    expect(lbl?.textContent).toContain("1.1G");
    expect(lbl?.textContent).toContain("2.1G");
  });

  // ── SVG size ───────────────────────────────────────────────────────────────

  it("applies the size property as the SVG dimensions", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut
        .used=${50}
        .total=${100}
        .size=${120}
      ></pxa-usage-donut>`,
    );
    const svg = el.shadowRoot!.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("120");
    expect(svg?.getAttribute("height")).toBe("120");
  });

  // ── Reactive updates ───────────────────────────────────────────────────────

  it("re-renders when used changes", async () => {
    const el = await fixture<UsageDonut>(
      html`<pxa-usage-donut .used=${30} .total=${100}></pxa-usage-donut>`,
    );
    el.used = 90;
    await elementUpdated(el);
    const pct = el.shadowRoot!.querySelector(".pct");
    expect(pct?.textContent?.trim()).toBe("90%");
  });
});

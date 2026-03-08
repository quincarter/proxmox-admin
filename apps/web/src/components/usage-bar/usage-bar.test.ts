import { describe, it, expect, afterEach } from "vitest";
import {
  fixture,
  html,
  fixtureCleanup,
  elementUpdated,
} from "@open-wc/testing";
import "./usage-bar.ts";
import type { UsageBar } from "./usage-bar.ts";

describe("pxa-usage-bar", () => {
  afterEach(() => fixtureCleanup());

  // ── Fill width ─────────────────────────────────────────────────────────────

  it("renders a fill element", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.5}></pxa-usage-bar>`,
    );
    expect(el.shadowRoot!.querySelector(".fill")).not.toBeNull();
  });

  it("sets fill width to the correct percentage", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.6}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector<HTMLElement>(".fill");
    expect(fill?.style.width).toBe("60%");
  });

  it("rounds fractional percentages", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.333}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector<HTMLElement>(".fill");
    // Math.round(0.333 * 100) = 33
    expect(fill?.style.width).toBe("33%");
  });

  it("clamps width to 100% when fraction exceeds 1", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${1.5}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector<HTMLElement>(".fill");
    expect(fill?.style.width).toBe("100%");
  });

  it("renders 0% fill when fraction is 0", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector<HTMLElement>(".fill");
    expect(fill?.style.width).toBe("0%");
  });

  // ── Color class ────────────────────────────────────────────────────────────

  it("applies class 'ok' when fraction is below 0.65", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.5}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector(".fill");
    expect(fill?.classList.contains("ok")).toBe(true);
  });

  it("applies class 'warn' when fraction is above 0.65", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.7}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector(".fill");
    expect(fill?.classList.contains("warn")).toBe(true);
  });

  it("applies class 'danger' when fraction is above 0.85", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.9}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector(".fill");
    expect(fill?.classList.contains("danger")).toBe(true);
  });

  it("applies 'warn' not 'danger' at exactly 0.86", async () => {
    // 0.86 > 0.85, so danger
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.86}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector(".fill");
    expect(fill?.classList.contains("danger")).toBe(true);
  });

  it("applies 'ok' at exactly 0.65", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.65}></pxa-usage-bar>`,
    );
    const fill = el.shadowRoot!.querySelector(".fill");
    // 0.65 is NOT > 0.65, so falls to 'ok'
    expect(fill?.classList.contains("ok")).toBe(true);
  });

  // ── Label ──────────────────────────────────────────────────────────────────

  it("renders a label span when label is set", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar label="CPU" .fraction=${0.4}></pxa-usage-bar>`,
    );
    const lbl = el.shadowRoot!.querySelector(".lbl");
    expect(lbl?.textContent?.trim()).toBe("CPU");
  });

  it("does not render a label span when label is empty", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.4}></pxa-usage-bar>`,
    );
    expect(el.shadowRoot!.querySelector(".lbl")).toBeNull();
  });

  // ── Value text ─────────────────────────────────────────────────────────────

  it("shows custom valueText when provided", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar
        .fraction=${0.5}
        valueText="1 GB / 2 GB"
      ></pxa-usage-bar>`,
    );
    const val = el.shadowRoot!.querySelector(".val");
    expect(val?.textContent?.trim()).toBe("1 GB / 2 GB");
  });

  it("falls back to pct% when valueText is empty", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.5}></pxa-usage-bar>`,
    );
    const val = el.shadowRoot!.querySelector(".val");
    expect(val?.textContent?.trim()).toBe("50%");
  });

  // ── Reactive updates ───────────────────────────────────────────────────────

  it("re-renders when fraction changes", async () => {
    const el = await fixture<UsageBar>(
      html`<pxa-usage-bar .fraction=${0.3}></pxa-usage-bar>`,
    );
    el.fraction = 0.9;
    await elementUpdated(el);
    const fill = el.shadowRoot!.querySelector<HTMLElement>(".fill");
    expect(fill?.style.width).toBe("90%");
    expect(fill?.classList.contains("danger")).toBe(true);
  });
});

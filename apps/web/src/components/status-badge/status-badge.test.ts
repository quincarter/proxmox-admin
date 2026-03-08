import { describe, it, expect, afterEach } from "vitest";
import {
  fixture,
  html,
  fixtureCleanup,
  elementUpdated,
} from "@open-wc/testing";
import "./status-badge.ts";
import type { StatusBadge } from "./status-badge.ts";

describe("pxa-status-badge", () => {
  afterEach(() => fixtureCleanup());

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders a dot and a label span", async () => {
    const el = await fixture<StatusBadge>(
      html`<pxa-status-badge status="running"></pxa-status-badge>`,
    );
    const dot = el.shadowRoot!.querySelector(".dot");
    const label = el.shadowRoot!.querySelector(".label");
    expect(dot).not.toBeNull();
    expect(label).not.toBeNull();
  });

  it("shows the status value as label text by default", async () => {
    const el = await fixture<StatusBadge>(
      html`<pxa-status-badge status="running"></pxa-status-badge>`,
    );
    const label = el.shadowRoot!.querySelector(".label");
    expect(label?.textContent?.trim()).toBe("running");
  });

  it("shows a custom label when the label property is set", async () => {
    const el = await fixture<StatusBadge>(
      html`<pxa-status-badge
        status="stopped"
        label="Powered off"
      ></pxa-status-badge>`,
    );
    const label = el.shadowRoot!.querySelector(".label");
    expect(label?.textContent?.trim()).toBe("Powered off");
  });

  // ── Property updates ───────────────────────────────────────────────────────

  it("re-renders when status property changes", async () => {
    const el = await fixture<StatusBadge>(
      html`<pxa-status-badge status="running"></pxa-status-badge>`,
    );
    el.status = "stopped";
    await elementUpdated(el);
    const label = el.shadowRoot!.querySelector(".label");
    expect(label?.textContent?.trim()).toBe("stopped");
  });

  it("reflects the status attribute back on the host element", async () => {
    const el = await fixture<StatusBadge>(
      html`<pxa-status-badge status="online"></pxa-status-badge>`,
    );
    expect(el.getAttribute("status")).toBe("online");
  });

  it("updates the reflected attribute when status property changes", async () => {
    const el = await fixture<StatusBadge>(
      html`<pxa-status-badge status="online"></pxa-status-badge>`,
    );
    el.status = "offline";
    await elementUpdated(el);
    expect(el.getAttribute("status")).toBe("offline");
  });

  // ── Status variants ────────────────────────────────────────────────────────

  it.each([
    "running",
    "stopped",
    "online",
    "offline",
    "paused",
    "suspended",
    "unknown",
    "active",
    "inactive",
  ] as const)("renders without error for status '%s'", async (status) => {
    const el = await fixture<StatusBadge>(
      html`<pxa-status-badge .status=${status}></pxa-status-badge>`,
    );
    expect(el.shadowRoot!.querySelector(".dot")).not.toBeNull();
  });
});

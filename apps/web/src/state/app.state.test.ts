import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  session,
  isAuthenticated,
  toasts,
  navigate,
  addToast,
  clearSession,
} from "./app.state.ts";
import type { SessionState } from "./app.state.ts";
import type { ServerConnection } from "@proxmox-admin/types";

const MOCK_SESSION: SessionState = {
  username: "root",
  realm: "pam",
  expiresAt: Date.now() / 1000 + 7200,
  server: {
    id: "s1",
    label: "pve-test",
    host: "192.168.1.10",
    port: 8006,
    tlsMode: "insecure",
  } as ServerConnection,
};

describe("app.state", () => {
  // ── navigate() ─────────────────────────────────────────────────────────────

  describe("navigate()", () => {
    let pushStateSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      pushStateSpy = vi.spyOn(history, "pushState");
    });

    afterEach(() => {
      pushStateSpy.mockRestore();
    });

    it("calls history.pushState with the given path", () => {
      navigate("/nodes");
      expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/nodes");
    });

    it("updates location.pathname to the given path", () => {
      navigate("/dashboard");
      expect(location.pathname).toBe("/dashboard");
    });

    it("handles paths with segments", () => {
      navigate("/nodes/pve");
      expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/nodes/pve");
    });

    it("handles deep paths with multiple segments", () => {
      navigate("/lxc/pve/100");
      expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/lxc/pve/100");
    });
  });

  // ── isAuthenticated ────────────────────────────────────────────────────────

  describe("isAuthenticated", () => {
    beforeEach(() => {
      session.value = null;
    });

    it("is false when session is null", () => {
      expect(isAuthenticated.value).toBe(false);
    });

    it("is true when a session is set", () => {
      session.value = MOCK_SESSION;
      expect(isAuthenticated.value).toBe(true);
    });

    it("reacts when session is cleared after being set", () => {
      session.value = MOCK_SESSION;
      expect(isAuthenticated.value).toBe(true);
      session.value = null;
      expect(isAuthenticated.value).toBe(false);
    });
  });

  // ── clearSession() ─────────────────────────────────────────────────────────

  describe("clearSession()", () => {
    let pushStateSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      session.value = MOCK_SESSION;
      pushStateSpy = vi.spyOn(history, "pushState");
    });

    afterEach(() => {
      pushStateSpy.mockRestore();
    });

    it("nulls the session signal", () => {
      clearSession();
      expect(session.value).toBeNull();
    });

    it("navigates to /login", () => {
      clearSession();
      expect(pushStateSpy).toHaveBeenCalledWith({}, "", "/login");
    });

    it("is safe to call when session is already null", () => {
      session.value = null;
      expect(() => clearSession()).not.toThrow();
      expect(session.value).toBeNull();
    });
  });

  // ── addToast() ─────────────────────────────────────────────────────────────

  describe("addToast()", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      toasts.value = [];
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("adds a toast to the toasts signal", () => {
      addToast("info", "Hello world");
      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0]).toMatchObject({
        type: "info",
        message: "Hello world",
      });
    });

    it("assigns a unique string id to each toast", () => {
      addToast("info", "First");
      addToast("success", "Second");
      const ids = toasts.value.map((t) => t.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it("supports all toast types", () => {
      const types = ["success", "error", "warning", "info"] as const;
      for (const type of types) {
        toasts.value = [];
        addToast(type, `${type} msg`);
        expect(toasts.value[0].type).toBe(type);
      }
    });

    it("removes the toast after the default duration (4 s)", () => {
      addToast("info", "Ephemeral");
      expect(toasts.value).toHaveLength(1);
      vi.advanceTimersByTime(4001);
      expect(toasts.value).toHaveLength(0);
    });

    it("removes the toast after a custom duration", () => {
      addToast("success", "Quick", 1000);
      vi.advanceTimersByTime(500);
      expect(toasts.value).toHaveLength(1);
      vi.advanceTimersByTime(501);
      expect(toasts.value).toHaveLength(0);
    });

    it("only removes the specific toast when multiple are present", () => {
      addToast("info", "First", 1000);
      addToast("info", "Second", 5000);
      vi.advanceTimersByTime(1001);
      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0].message).toBe("Second");
    });
  });
});

/**
 * SSH SharedWorker — manages terminal sessions across browser tabs.
 *
 * A single SharedWorker instance is shared by all tabs on the same origin.  Each SSH
 * session is identified by a unique sessionId.  When the user "pops out" a terminal into
 * a new window, that window attaches to the existing session through this worker so the
 * connection is never interrupted.
 *
 * Flow:
 *   Tab A  ──create──►  SharedWorker  ──WebSocket──►  NestJS SshGateway ──ssh2──►  Host
 *   Tab B  ──attach──►  SharedWorker  (replays buffer, then receives live output)
 *
 * When all tabs detach from a session, the WebSocket is closed and the session is destroyed.
 */

/// <reference lib="webworker" />

import type {
  SshClientMessage,
  SshServerMessage,
  SshWorkerInbound,
  SshWorkerCreate,
  SshWorkerOutbound,
} from "@proxmox-admin/types";

/** Maximum characters retained as replay buffer for late-joining tabs. */
const MAX_BUFFER_CHARS = 50_000;

interface ManagedSession {
  ws: WebSocket;
  ports: Set<MessagePort>;
  /** Recent output stored as chunks.  New viewers receive this on attach. */
  buffer: string[];
  bufferChars: number;
  /** Params carried over from the create message for ws-reconnect purposes. */
  initMsg: SshWorkerCreate;
}

const sessions = new Map<string, ManagedSession>();

// ── Worker entry ─────────────────────────────────────────────────────────────

declare const self: SharedWorkerGlobalScope;

self.addEventListener("connect", (connectEvent: MessageEvent) => {
  const port = (connectEvent as MessageEvent & { ports: MessagePort[] })
    .ports[0];

  port.addEventListener("message", (ev: MessageEvent<SshWorkerInbound>) => {
    handlePortMessage(port, ev.data);
  });

  port.start();
});

// ── Inbound message routing ──────────────────────────────────────────────────

function handlePortMessage(port: MessagePort, msg: SshWorkerInbound): void {
  switch (msg.type) {
    case "create":
      createSession(port, msg);
      break;
    case "attach":
      attachToSession(port, msg.sessionId);
      break;
    case "input": {
      const s = sessions.get(msg.sessionId);
      if (s?.ws.readyState === WebSocket.OPEN) {
        s.ws.send(
          JSON.stringify({
            type: "input",
            data: msg.data,
          } satisfies SshClientMessage),
        );
      }
      break;
    }
    case "resize": {
      const s = sessions.get(msg.sessionId);
      if (s?.ws.readyState === WebSocket.OPEN) {
        s.ws.send(
          JSON.stringify({
            type: "resize",
            cols: msg.cols,
            rows: msg.rows,
          } satisfies SshClientMessage),
        );
      }
      break;
    }
    case "detach":
      detachPort(port, msg.sessionId);
      break;
  }
}

// ── Session lifecycle ────────────────────────────────────────────────────────

function createSession(port: MessagePort, msg: SshWorkerCreate): void {
  // If a session with this id already exists just attach the port.
  if (sessions.has(msg.sessionId)) {
    attachToSession(port, msg.sessionId);
    return;
  }

  const ws = new WebSocket(buildWsUrl());

  const session: ManagedSession = {
    ws,
    ports: new Set([port]),
    buffer: [],
    bufferChars: 0,
    initMsg: msg,
  };
  sessions.set(msg.sessionId, session);

  ws.addEventListener("open", () => {
    ws.send(
      JSON.stringify({
        type: "init",
        node: msg.node,
        vmid: msg.vmid,
        guestType: msg.guestType,
        username: msg.username,
        password: msg.password,
        privateKey: msg.privateKey,
        cols: msg.cols,
        rows: msg.rows,
      } satisfies SshClientMessage),
    );
  });

  ws.addEventListener("message", (ev: MessageEvent<string>) => {
    const srv = JSON.parse(ev.data) as SshServerMessage;
    dispatchServerMessage(session, msg.sessionId, srv);
  });

  ws.addEventListener("error", () => {
    broadcast(session, {
      type: "error",
      sessionId: msg.sessionId,
      message: "WebSocket connection to SSH gateway failed",
    });
  });

  ws.addEventListener("close", () => {
    if (sessions.has(msg.sessionId)) {
      broadcast(session, { type: "closed", sessionId: msg.sessionId });
      sessions.delete(msg.sessionId);
    }
  });
}

function attachToSession(port: MessagePort, sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    port.postMessage({
      type: "error",
      sessionId,
      message: "Session not found — it may have closed",
    } satisfies SshWorkerOutbound);
    return;
  }

  session.ports.add(port);

  // Replay buffered output so the new viewer sees the full history.
  if (session.buffer.length > 0) {
    port.postMessage({ type: "ready", sessionId } satisfies SshWorkerOutbound);
    port.postMessage({
      type: "output",
      sessionId,
      data: session.buffer.join(""),
    } satisfies SshWorkerOutbound);
  }
}

function detachPort(port: MessagePort, sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  session.ports.delete(port);

  if (session.ports.size === 0) {
    // Last consumer left — tear down the WebSocket and remove the session.
    session.ws.close(1000, "All consumers disconnected");
    sessions.delete(sessionId);
  }
}

// ── Server message handling ──────────────────────────────────────────────────

function dispatchServerMessage(
  session: ManagedSession,
  sessionId: string,
  msg: SshServerMessage,
): void {
  switch (msg.type) {
    case "ready":
      broadcast(session, { type: "ready", sessionId });
      break;
    case "output":
      appendBuffer(session, msg.data);
      broadcast(session, { type: "output", sessionId, data: msg.data });
      break;
    case "error":
      broadcast(session, { type: "error", sessionId, message: msg.message });
      break;
    case "closed":
      broadcast(session, { type: "closed", sessionId });
      sessions.delete(sessionId);
      break;
    case "needs-credentials":
      broadcast(session, { type: "needs-credentials", sessionId });
      break;
    case "pong":
      // keepalive — no action needed
      break;
  }
}

// ── Utilities ────────────────────────────────────────────────────────────────

function broadcast(session: ManagedSession, msg: SshWorkerOutbound): void {
  for (const port of session.ports) {
    port.postMessage(msg);
  }
}

function appendBuffer(session: ManagedSession, data: string): void {
  session.buffer.push(data);
  session.bufferChars += data.length;

  // Trim oldest chunks when the buffer exceeds the limit.
  while (session.bufferChars > MAX_BUFFER_CHARS && session.buffer.length > 1) {
    const removed = session.buffer.shift()!;
    session.bufferChars -= removed.length;
  }
}

function buildWsUrl(): string {
  const proto = self.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${self.location.host}/ws/ssh`;
}

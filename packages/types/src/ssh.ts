/**
 * SSH terminal feature types — shared between the BFF gateway and the web app workers.
 *
 * Architecture overview:
 *   Browser tab → SharedWorker → WebSocket → NestJS SshGateway → ssh2 → Proxmox node SSH
 *
 * The NestJS gateway opens the actual SSH connection (using the `ssh2` Node.js library) and
 * relays terminal I/O over WebSocket.  A SharedWorker manages sessions across tabs so that a
 * terminal can be "popped out" into a standalone window without dropping the connection.
 *
 * Future: the NestJS gateway can be replaced with a lightweight TCP relay (WebSocket → TCP)
 * to allow a WASM SSH client (e.g. sshclient-wasm) running in the SharedWorker to own the
 * full SSH handshake client-side, keeping raw credentials off the server wire.
 */

export type SshGuestType = "lxc" | "qemu";

// ── WebSocket Protocol (browser ↔ NestJS SshGateway) ──────────────────────

/** Initiates an SSH session.  The server resolves the target host from the Proxmox session.
 *  If `username` is omitted the gateway will attempt to use credentials stored in the
 *  current Proxmox session (PAM realm logins only). */
export interface SshInitMessage {
  type: "init";
  node: string;
  vmid: number;
  guestType: SshGuestType;
  /** Omit to request auto-auth from session creds. */
  username?: string;
  password?: string;
  /** PEM-formatted private key. */
  privateKey?: string;
  cols: number;
  rows: number;
}

/** Raw terminal input (key presses, paste data). */
export interface SshInputMessage {
  type: "input";
  data: string;
}

/** Terminal resize notification from the client. */
export interface SshResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

export interface SshPingMessage {
  type: "ping";
}

export type SshClientMessage =
  | SshInitMessage
  | SshInputMessage
  | SshResizeMessage
  | SshPingMessage;

// ── Server → Client ────────────────────────────────────────────────────────

/** SSH session is open; terminal I/O can start. */
export interface SshReadyMessage {
  type: "ready";
}

/** Chunk of terminal output from the remote host. */
export interface SshOutputMessage {
  type: "output";
  data: string;
}

export interface SshErrorMessage {
  type: "error";
  message: string;
}

/** Remote channel closed or server disconnected. */
export interface SshClosedMessage {
  type: "closed";
}

/** No credentials are stored in the current session — the client must prompt the user. */
export interface SshNeedsCredentialsMessage {
  type: "needs-credentials";
}

export interface SshPongMessage {
  type: "pong";
}

export type SshServerMessage =
  | SshReadyMessage
  | SshOutputMessage
  | SshErrorMessage
  | SshClosedMessage
  | SshNeedsCredentialsMessage
  | SshPongMessage;

// ── SharedWorker Protocol (browser tab ↔ SharedWorker) ────────────────────

/**
 * Creates a new SSH session in the SharedWorker.  The worker opens a WebSocket to the
 * NestJS gateway and sends the `init` message.  Subsequent `input`/`resize` messages
 * for this sessionId are forwarded to the same WebSocket.
 */
export interface SshWorkerCreate {
  type: "create";
  sessionId: string;
  node: string;
  vmid: number;
  guestType: SshGuestType;
  /** Omit to request session-based auto-auth. */
  username?: string;
  password?: string;
  privateKey?: string;
  cols: number;
  rows: number;
}

/**
 * Attaches an additional tab/port to an existing session.  On success the worker
 * replays the recent output buffer to get the new viewer up to date, then streams
 * live output.  Used when a tab pops out the terminal into a new window.
 */
export interface SshWorkerAttach {
  type: "attach";
  sessionId: string;
}

export interface SshWorkerInput {
  type: "input";
  sessionId: string;
  data: string;
}

export interface SshWorkerResize {
  type: "resize";
  sessionId: string;
  cols: number;
  rows: number;
}

/**
 * Detaches a tab from a session.  When the last tab detaches, the SharedWorker
 * closes the WebSocket and destroys the session.
 */
export interface SshWorkerDetach {
  type: "detach";
  sessionId: string;
}

export type SshWorkerInbound =
  | SshWorkerCreate
  | SshWorkerAttach
  | SshWorkerInput
  | SshWorkerResize
  | SshWorkerDetach;

// ── SharedWorker → tab ─────────────────────────────────────────────────────

export interface SshWorkerReady {
  type: "ready";
  sessionId: string;
}

export interface SshWorkerOutput {
  type: "output";
  sessionId: string;
  data: string;
}

export interface SshWorkerError {
  type: "error";
  sessionId: string;
  message: string;
}

export interface SshWorkerClosed {
  type: "closed";
  sessionId: string;
}

/** No session credentials are available — the tab must display the credential form. */
export interface SshWorkerNeedsCredentials {
  type: "needs-credentials";
  sessionId: string;
}

export type SshWorkerOutbound =
  | SshWorkerReady
  | SshWorkerOutput
  | SshWorkerError
  | SshWorkerClosed
  | SshWorkerNeedsCredentials;

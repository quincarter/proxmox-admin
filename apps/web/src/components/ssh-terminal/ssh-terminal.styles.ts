import { css } from "lit";

export const SshTerminalStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--surface-1, #0d1117);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    font-family: inherit;
  }

  /* ── Credentials form ────────────────────────────────────────────────── */

  .credentials-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    max-width: 440px;
    width: 100%;
    margin: auto;
  }

  .form-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #e6edf3);
    letter-spacing: 0.01em;
  }

  .form-subtitle {
    font-size: 12px;
    color: var(--text-muted, #848d97);
    margin-top: -8px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-field label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary, #8b949e);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-field input,
  .form-field textarea {
    background: var(--surface-2, #161b22);
    border: 1px solid var(--border, #30363d);
    border-radius: var(--radius-sm, 6px);
    color: var(--text-primary, #e6edf3);
    font-size: 13px;
    padding: 9px 12px;
    outline: none;
    transition: border-color 0.15s;
    font-family: inherit;
    resize: vertical;
  }

  .form-field input:focus,
  .form-field textarea:focus {
    border-color: var(--accent, #58a6ff);
  }

  .form-field textarea {
    font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", monospace;
    font-size: 11px;
    min-height: 100px;
  }

  /* Auth mode tabs */
  .auth-tabs {
    display: flex;
    gap: 4px;
    background: var(--surface-2, #161b22);
    border-radius: var(--radius-sm, 6px);
    padding: 3px;
  }

  .auth-tabs button {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-secondary, #8b949e);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .auth-tabs button.active {
    background: var(--surface-3, #21262d);
    color: var(--text-primary, #e6edf3);
  }

  .connect-btn {
    background: var(--accent, #1f6feb);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm, 6px);
    font-size: 13px;
    font-weight: 600;
    padding: 10px 20px;
    cursor: pointer;
    transition: background 0.15s;
    align-self: flex-start;
  }

  .connect-btn:hover {
    background: var(--accent-hover, #388bfd);
  }

  /* ── Terminal shell ───────────────────────────────────────────────────── */

  .terminal-shell {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  /* Toolbar */
  .terminal-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--surface-2, #161b22);
    border-bottom: 1px solid var(--border, #30363d);
    flex-shrink: 0;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted, #484f58);
    flex-shrink: 0;
    transition: background 0.3s;
  }

  .status-dot.connected {
    background: #3fb950;
    box-shadow: 0 0 6px #3fb95066;
  }

  .session-label {
    font-size: 12px;
    color: var(--text-secondary, #8b949e);
    flex: 1;
    letter-spacing: 0.02em;
  }

  .toolbar-btn {
    background: transparent;
    border: none;
    color: var(--text-muted, #484f58);
    font-size: 14px;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }

  .toolbar-btn:hover {
    background: var(--surface-3, #21262d);
    color: var(--text-primary, #e6edf3);
  }

  .disconnect-btn:hover {
    color: #f85149;
  }

  /* Terminal container — xterm.js mounts here */
  .terminal-container {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 4px;
    background: #0d1117;
  }

  /* Ensure xterm canvas fills the container */
  .terminal-container .xterm {
    height: 100%;
  }

  .terminal-container .xterm-viewport {
    border-radius: 0;
  }

  /* Overlay states */
  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: #0d1117cc;
    backdrop-filter: blur(2px);
    z-index: 10;
  }

  .overlay-text {
    font-size: 14px;
    color: var(--text-secondary, #8b949e);
  }

  .overlay-error {
    font-size: 13px;
    color: #f85149;
    max-width: 360px;
    text-align: center;
  }

  .overlay-btn {
    background: var(--surface-3, #21262d);
    border: 1px solid var(--border, #30363d);
    border-radius: var(--radius-sm, 6px);
    color: var(--text-primary, #e6edf3);
    font-size: 12px;
    font-weight: 500;
    padding: 7px 16px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .overlay-btn:hover {
    background: var(--surface-2, #161b22);
  }

  /* Spinner for connecting state */
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border, #30363d);
    border-top-color: var(--accent, #58a6ff);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile adjustments */
  @media (max-width: 600px) {
    .credentials-form {
      padding: 16px;
      max-width: 100%;
      margin: 0;
    }

    .terminal-container {
      padding: 2px;
    }
  }
`;

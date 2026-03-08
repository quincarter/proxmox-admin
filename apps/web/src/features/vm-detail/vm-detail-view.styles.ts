import { css } from "lit";

export const VmDetailViewStyles = css`
  :host {
    display: block;
    padding: var(--space-6);
  }

  .back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 13px;
    cursor: pointer;
    padding: 0;
    margin-bottom: var(--space-4);
    font-family: inherit;
  }
  .back:hover {
    color: var(--color-text-primary);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    color: var(--color-text-primary);
  }
  .vmid-chip {
    font-size: 13px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    background: var(--color-bg-overlay);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }
  .type-chip {
    font-size: 11px;
    font-weight: 600;
    background: var(--color-info-bg);
    color: var(--color-info);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: var(--space-6);
    align-items: start;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  .gauges {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    border: 1px solid var(--color-bg-overlay);
    margin-bottom: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .gauges-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }

  .actions-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    border: 1px solid var(--color-bg-overlay);
    margin-bottom: var(--space-4);
  }
  .actions-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
  }

  .config-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    border: 1px solid var(--color-bg-overlay);
  }
  .config-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-3);
  }
  .config-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    font-size: 13px;
  }
  .config-row {
    display: grid;
    grid-template-columns: 130px 1fr;
    gap: var(--space-3);
    align-items: start;
  }
  .config-key {
    color: var(--color-text-muted);
  }
  .config-val {
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    font-size: 12px;
    word-break: break-all;
  }

  .disks-section {
    margin-top: var(--space-4);
    border-top: 1px solid var(--color-bg-overlay);
    padding-top: var(--space-4);
  }
  .disks-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-2);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-text-secondary);
  }

  .io-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .io-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
  }
  .io-label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .io-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    margin-top: 2px;
  }

  .loading {
    padding: var(--space-6);
    color: var(--color-text-muted);
    font-size: 13px;
  }
  .error {
    padding: var(--space-6);
    color: var(--color-danger);
    font-size: 13px;
  }

  /* ── SSH terminal ────────────────────────────────────────────────────── */

  .ssh-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    cursor: pointer;
    margin-bottom: var(--space-4);
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .ssh-btn:hover {
    color: var(--color-text-primary);
    border-color: var(--color-accent);
  }

  .ssh-terminal-panel {
    margin-bottom: var(--space-4);
    height: 460px;
    min-height: 200px;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1px solid var(--color-bg-overlay);
  }

  .ssh-terminal-panel pxa-ssh-terminal {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }

  /* ── Tabs ─────────────────────────────────────────────────────────────── */

  .tabs {
    display: flex;
    gap: 0;
    margin-bottom: var(--space-5);
    border-bottom: 1px solid var(--color-bg-overlay);
  }

  .tab-btn {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    cursor: pointer;
    font-family: inherit;
    transition:
      color 0.15s,
      border-color 0.15s;
    margin-bottom: -1px;
  }
  .tab-btn:hover {
    color: var(--color-text-primary);
  }
  .tab-btn.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .tab-content {
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

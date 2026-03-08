import { css } from "lit";

export const StorageDetailViewStyles = css`
  :host {
    display: block;
    padding: var(--space-6);
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: var(--text-sm);
    padding: 0;
    margin-bottom: var(--space-4);
  }

  .back-btn:hover {
    color: var(--color-text-primary);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  h1 {
    margin: 0;
    font-size: var(--text-2xl);
    color: var(--color-text-primary);
  }

  .type-chip {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    background: var(--color-bg-tertiary);
    color: var(--color-text-muted);
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
  }

  .layout {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: var(--space-6);
    align-items: start;
  }

  .panel {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .panel-title {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-3) 0;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-1) var(--space-4);
    font-size: var(--text-sm);
  }

  .meta-label {
    color: var(--color-text-muted);
  }

  .meta-value {
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    word-break: break-all;
  }

  .donut-center {
    display: flex;
    justify-content: center;
    padding: var(--space-2) 0 var(--space-4);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  thead th {
    text-align: left;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-2) var(--space-3);
  }

  tbody tr:hover {
    background: var(--color-bg-tertiary);
  }

  td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--color-border-subtle, var(--color-border));
    color: var(--color-text-primary);
  }

  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  .content-type {
    font-size: var(--text-xs);
    background: var(--color-bg-tertiary);
    color: var(--color-text-muted);
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
  }

  .loading,
  .error,
  .empty {
    padding: var(--space-6);
    color: var(--color-text-muted);
    text-align: center;
    font-size: var(--text-sm);
  }

  .error {
    color: var(--color-danger);
  }
`;

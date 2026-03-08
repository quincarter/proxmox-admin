import { css } from "lit";

export const StorageViewStyles = css`
  :host {
    display: block;
    padding: var(--space-6);
  }

  h1 {
    margin: 0 0 var(--space-6);
    font-size: 22px;
    color: var(--color-text-primary);
  }

  .pools-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .pool-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .pool-card:hover {
    border-color: var(--color-brand);
    background: var(--color-bg-hover);
  }

  .pool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pool-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .pool-type {
    font-size: 11px;
    font-weight: 600;
    background: var(--color-bg-overlay);
    color: var(--color-text-muted);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pool-donut {
    display: flex;
    justify-content: center;
    padding: var(--space-2) 0;
  }

  .pool-meta {
    font-size: 12px;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .pool-meta-row {
    display: flex;
    justify-content: space-between;
  }
  .pool-content {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: var(--space-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
`;

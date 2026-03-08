import { css } from "lit";

export const LxcViewStyles = css`
  :host {
    display: block;
    padding: var(--space-6);
    max-width: 1400px;
  }
  h1 {
    font-size: var(--text-2xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-6);
  }
  .table-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-bg-overlay);
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }
  th {
    text-align: left;
    padding: var(--space-2) var(--space-3);
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--color-bg-overlay);
  }
  td {
    padding: var(--space-2) var(--space-3);
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-bg-surface);
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: var(--color-bg-surface);
  }
  .name {
    color: var(--color-text-primary);
    font-weight: 500;
  }
  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
  .vmid {
    color: var(--color-text-muted);
    font-size: var(--text-xs);
  }
  .tags {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  .tag {
    background: var(--color-bg-overlay);
    border-radius: var(--radius-sm);
    padding: 1px 6px;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
  .loading {
    color: var(--color-text-muted);
    padding: var(--space-4);
  }
  .error {
    color: var(--color-danger);
    padding: var(--space-4);
  }
  .empty {
    color: var(--color-text-muted);
    padding: var(--space-6);
    text-align: center;
  }
`;

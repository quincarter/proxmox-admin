import { css } from "lit";

export const VmViewStyles = css`
  :host {
    display: block;
    padding: var(--space-6);
  }

  h1 {
    margin: 0 0 var(--space-6);
    font-size: 22px;
    color: var(--color-text-primary);
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
  }
  thead th {
    text-align: left;
    padding: var(--space-3) var(--space-4);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--color-bg-overlay);
    background: var(--color-bg-surface);
  }
  tbody tr {
    border-bottom: 1px solid var(--color-bg-overlay);
    cursor: pointer;
    transition: background 0.1s;
  }
  tbody tr:last-child {
    border-bottom: none;
  }
  tbody tr:hover {
    background: var(--color-bg-hover);
  }
  td {
    padding: var(--space-3) var(--space-4);
    font-size: 13px;
    color: var(--color-text-secondary);
    vertical-align: middle;
  }
  td.name {
    font-weight: 600;
    color: var(--color-text-primary);
  }
  td.mono {
    font-family: var(--font-mono);
    font-size: 12px;
  }
  td.vmid {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .tag {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-overlay);
    color: var(--color-text-muted);
  }

  .loading {
    padding: var(--space-6);
    color: var(--color-text-muted);
    font-size: 13px;
  }
  .empty {
    padding: var(--space-6);
    color: var(--color-text-muted);
    font-size: 13px;
    text-align: center;
  }
  .error {
    padding: var(--space-6);
    color: var(--color-danger);
    font-size: 13px;
  }
`;

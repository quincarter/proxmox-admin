import { css } from "lit";

export const NodeDetailViewStyles = css`
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

  h1 {
    margin: 0 0 var(--space-6);
    font-size: 22px;
    color: var(--color-text-primary);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  .stat-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    border: 1px solid var(--color-bg-overlay);
  }
  .stat-label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-1);
  }
  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1.2;
  }
  .stat-sub {
    font-size: 12px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  .gauges {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    border: 1px solid var(--color-bg-overlay);
    margin-bottom: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .gauges h3 {
    margin: 0 0 var(--space-2);
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3) var(--space-6);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-6);
    font-size: 13px;
  }
  .info-key {
    color: var(--color-text-muted);
  }
  .info-val {
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .section {
    margin-bottom: var(--space-6);
  }
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }
  .section-title {
    font-size: 15px;
    font-weight: 600;
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

  .task-row {
    cursor: default;
  }
  .task-row:hover {
    background: transparent !important;
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    background: var(--color-bg-overlay);
    color: var(--color-text-secondary);
  }
  .task-ok {
    color: var(--color-success);
  }
  .task-running {
    color: var(--color-info);
  }
  .task-err {
    color: var(--color-danger);
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

import { css } from "lit";

export const DashboardViewStyles = css`
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

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .stat-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    border: 1px solid var(--color-bg-overlay);
  }

  .stat-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-2);
  }

  .stat-value {
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    line-height: 1;
  }

  .stat-sub {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    margin: 0 0 var(--space-3);
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
    font-weight: var(--weight-semibold);
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

  .table-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-bg-overlay);
    overflow: hidden;
    margin-bottom: var(--space-6);
  }

  .table-header {
    padding: var(--space-4) var(--space-4) var(--space-3);
    border-bottom: 1px solid var(--color-bg-overlay);
  }

  .loading {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    padding: var(--space-4);
    text-align: center;
  }

  .error {
    color: var(--color-danger);
    font-size: var(--text-sm);
    padding: var(--space-4);
  }

  .name {
    color: var(--color-text-primary);
    font-weight: var(--weight-medium);
  }
  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
  .usage-bar {
    height: 4px;
    background: var(--color-bg-overlay);
    border-radius: var(--radius-full);
    overflow: hidden;
    width: 80px;
  }
  .usage-fill {
    height: 100%;
    border-radius: var(--radius-full);
    background: var(--color-brand);
    transition: width var(--duration-normal);
  }
  .usage-fill.warn {
    background: var(--color-warning);
  }
  .usage-fill.danger {
    background: var(--color-danger);
  }

  /* ── Datacenter metric section ─────────────────────────────────────── */

  .dc-section {
    margin-bottom: var(--space-6);
  }

  .dc-section-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .dc-live-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-success);
  }

  .dc-live-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-success);
    animation: dc-pulse 2s ease-in-out infinite;
  }

  @keyframes dc-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .dc-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .dc-card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    border: 1px solid var(--color-bg-overlay);
    display: flex;
    align-items: center;
    gap: var(--space-5);
  }

  .dc-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .dc-label {
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .dc-value {
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    line-height: 1.1;
  }

  .dc-sub {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

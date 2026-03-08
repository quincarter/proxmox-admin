import { css } from "lit";

export const NodesViewStyles = css`
  :host {
    display: block;
    padding: var(--space-6);
  }

  h1 {
    margin: 0 0 var(--space-6);
    font-size: 22px;
    color: var(--color-text-primary);
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
  }

  .node-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    cursor: pointer;
    transition:
      background 120ms ease,
      transform 120ms ease,
      box-shadow 120ms ease;
    box-shadow: var(--shadow-sm);
  }
  .node-card:hover {
    background: var(--color-bg-overlay);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .node-name {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.2;
  }
  .card-ip {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 4px;
  }

  .card-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .stat-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .card-footer {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-bg-overlay);
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .loading {
    color: var(--color-text-muted);
    padding: var(--space-6);
  }
  .error {
    color: var(--color-danger);
    padding: var(--space-4);
  }
`;

import { css } from "lit";

export const UsageBarStyles = css`
  :host {
    display: block;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .lbl {
    font-size: 12px;
    color: var(--color-text-secondary);
    width: 48px;
    flex-shrink: 0;
  }
  .track {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--color-bg-overlay);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .fill.ok {
    background: var(--color-success);
  }
  .fill.warn {
    background: var(--color-warning);
  }
  .fill.danger {
    background: var(--color-danger);
  }
  .val {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--color-text-secondary);
    width: 56px;
    text-align: right;
    flex-shrink: 0;
  }
`;

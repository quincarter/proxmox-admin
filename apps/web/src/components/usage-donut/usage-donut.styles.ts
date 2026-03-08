import { css } from "lit";

export const UsageDonutStyles = css`
  :host {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .donut-wrap {
    position: relative;
  }
  svg {
    display: block;
    transform: rotate(-90deg);
  }
  .center-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .pct {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
  }
  .label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: center;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .used-label {
    font-size: 11px;
    color: var(--color-text-secondary);
  }
`;

import { css } from "lit";

export const ActionPanelStyles = css`
  :host {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  button {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      opacity 0.15s,
      background 0.15s;
    font-family: inherit;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-brand);
    color: #fff;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-brand-hover);
  }

  .btn-danger {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--color-danger);
    color: #fff;
  }

  .btn-muted {
    background: var(--color-bg-overlay);
    color: var(--color-text-secondary);
  }
  .btn-muted:hover:not(:disabled) {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .confirm-strip {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    font-size: 12px;
    color: var(--color-danger);
  }
  .confirm-strip button {
    background: var(--color-danger);
    color: #fff;
    padding: 3px 10px;
  }
  .confirm-cancel {
    background: transparent !important;
    color: var(--color-text-muted) !important;
    text-decoration: underline;
    padding: 0 !important;
  }
  .confirm-cancel:hover {
    color: var(--color-text-primary) !important;
  }

  .spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 4px;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

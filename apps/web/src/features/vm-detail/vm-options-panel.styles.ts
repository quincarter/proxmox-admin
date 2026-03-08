import { css } from "lit";

export const VmOptionsPanelStyles = css`
  :host {
    display: block;
  }

  .panel {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-bg-overlay);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-bg-overlay);
  }

  .panel-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 12px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    cursor: pointer;
    font-family: inherit;
    transition:
      background 0.15s,
      opacity 0.15s;
  }
  .btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btn-edit {
    background: var(--color-bg-overlay);
    color: var(--color-text-primary);
    border-color: var(--color-bg-overlay);
  }
  .btn-edit:hover:not(:disabled) {
    background: var(--color-bg-overlay2, #3a3d47);
  }

  .btn-save {
    background: var(--color-accent);
    color: #fff;
  }
  .btn-save:hover:not(:disabled) {
    opacity: 0.88;
  }

  .btn-revert {
    background: none;
    color: var(--color-text-muted);
    border-color: var(--color-bg-overlay);
  }
  .btn-revert:hover:not(:disabled) {
    color: var(--color-text-primary);
  }

  .option-table {
    width: 100%;
    border-collapse: collapse;
  }

  .option-row {
    display: grid;
    grid-template-columns: 240px 1fr;
    align-items: center;
    border-bottom: 1px solid var(--color-bg-overlay);
    min-height: 40px;
  }
  .option-row:last-child {
    border-bottom: none;
  }

  .option-label {
    padding: var(--space-2) var(--space-4);
    font-size: 13px;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .option-value {
    padding: var(--space-2) var(--space-4) var(--space-2) 0;
    font-size: 13px;
    color: var(--color-text-primary);
    font-family: var(--font-mono);
  }

  .option-value.edit {
    padding-top: 6px;
    padding-bottom: 6px;
  }

  input[type="text"],
  input[type="number"],
  select {
    background: var(--color-bg-base);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: 13px;
    font-family: var(--font-mono);
    padding: 4px 8px;
    width: 100%;
    max-width: 360px;
    box-sizing: border-box;
    outline: none;
  }
  input[type="text"]:focus,
  input[type="number"]:focus,
  select:focus {
    border-color: var(--color-accent);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  .badge-yes {
    color: var(--color-success, #57ab5a);
  }
  .badge-no {
    color: var(--color-text-muted);
  }

  .saving-overlay {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-bg-overlay);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-banner {
    padding: var(--space-2) var(--space-4);
    font-size: 12px;
    color: var(--color-error, #e5534b);
    background: var(--color-error-bg, rgba(229, 83, 75, 0.12));
    border-top: 1px solid var(--color-bg-overlay);
  }
`;

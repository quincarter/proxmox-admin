import { css } from "lit";

export const LxcResourcesPanelStyles = css`
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

  .res-row {
    display: grid;
    grid-template-columns: 240px 1fr;
    align-items: center;
    border-bottom: 1px solid var(--color-bg-overlay);
    min-height: 40px;
  }
  .res-row:last-child {
    border-bottom: none;
  }

  .res-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-size: 13px;
    color: var(--color-text-muted);
    font-weight: 500;
  }
  .res-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .res-value {
    padding: var(--space-2) var(--space-4) var(--space-2) 0;
    font-size: 13px;
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    word-break: break-all;
  }

  .res-value.edit {
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .res-value.muted {
    color: var(--color-text-muted);
    font-style: italic;
    font-family: var(--font-sans);
  }

  .edit-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .edit-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .edit-label {
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-sans);
  }

  input[type="number"],
  input[type="text"],
  select {
    background: var(--color-bg-base);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: 13px;
    font-family: var(--font-mono);
    padding: 4px 8px;
    box-sizing: border-box;
    outline: none;
    width: 120px;
  }
  input[type="number"]:focus,
  input[type="text"]:focus,
  select:focus {
    border-color: var(--color-accent);
  }

  .section-divider {
    padding: var(--space-2) var(--space-4);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-bg-overlay);
    background: var(--color-bg-base);
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

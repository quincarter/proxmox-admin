import { css } from "lit";

export const LoginViewStyles = css`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--color-bg-base);
    padding: var(--space-4);
  }

  .card {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    padding: var(--space-8);
    width: 100%;
    max-width: 400px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-8);
  }
  .brand-icon {
    width: 40px;
    height: 40px;
    background: var(--color-brand);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .brand-title {
    font-size: var(--text-xl);
    font-weight: var(--weight-bold);
    color: var(--color-text-primary);
    line-height: 1.2;
  }
  .brand-sub {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .form-group {
    margin-bottom: var(--space-4);
  }
  label {
    display: block;
    font-size: var(--text-xs);
    font-weight: var(--weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: var(--space-1);
  }
  input,
  select {
    width: 100%;
    background: var(--color-bg-surface);
    border: 1px solid var(--color-bg-overlay);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: var(--text-sm);
    font-family: var(--font-sans);
    padding: var(--space-2) var(--space-3);
    outline: none;
    transition: border-color var(--duration-fast);
    box-sizing: border-box;
  }
  input:focus,
  select:focus {
    border-color: var(--color-brand);
  }
  select option {
    background: var(--color-bg-elevated);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2);
  }
  .row input:first-child {
    min-width: 0;
  }

  .check-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }
  .check-row input[type="checkbox"] {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: var(--color-brand);
  }

  .error {
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
    color: var(--color-danger);
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
    margin-bottom: var(--space-4);
  }

  .btn-primary {
    width: 100%;
    padding: var(--space-3);
    background: var(--color-brand);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
    font-weight: var(--weight-semibold);
    font-family: var(--font-sans);
    cursor: pointer;
    transition: background var(--duration-fast);
    margin-top: var(--space-2);
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-brand-hover);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .divider {
    height: 1px;
    background: var(--color-bg-overlay);
    margin: var(--space-4) 0;
  }
`;

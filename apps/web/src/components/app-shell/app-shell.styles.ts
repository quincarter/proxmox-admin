import { css } from "lit";

export const AppShellStyles = css`
  :host {
    display: flex;
    justify-content: center;
    min-height: 100vh;
    background: var(--color-bg-base);
  }

  .authenticated-layout {
    display: flex;
    flex: 1;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    min-height: 100vh;
  }

  .header {
    height: var(--header-height, 52px);
    display: flex;
    align-items: center;
    padding: 0 var(--space-6);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-bg-overlay);
    gap: var(--space-4);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .header-breadcrumb {
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    color: var(--color-text-primary);
    text-transform: capitalize;
  }

  .header-server {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* SSE realtime status dot */
  .sse-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    transition: background var(--duration-normal);
  }
  .sse-connected {
    background: var(--color-success);
    box-shadow: 0 0 6px var(--color-success);
    animation: sse-pulse 2.5s ease-in-out infinite;
  }
  .sse-reconnecting {
    background: var(--color-warning);
    animation: sse-pulse 0.8s ease-in-out infinite;
  }
  .sse-connecting,
  .sse-error {
    background: var(--color-text-muted);
  }
  @keyframes sse-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  .view-host {
    padding: var(--space-2) 0;
  }

  /* Toast container */
  .toast-stack {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-2);
    z-index: 1000;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: var(--weight-medium);
    box-shadow: var(--shadow-lg);
    animation: toast-in var(--duration-normal) var(--ease-spring);
    pointer-events: auto;
    max-width: 360px;
  }

  @keyframes toast-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .toast-success {
    background: var(--color-success-bg);
    color: var(--color-success);
    border: 1px solid var(--color-success);
  }
  .toast-error {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border: 1px solid var(--color-danger);
  }
  .toast-warning {
    background: var(--color-warning-bg);
    color: var(--color-warning);
    border: 1px solid var(--color-warning);
  }
  .toast-info {
    background: var(--color-info-bg);
    color: var(--color-info);
    border: 1px solid var(--color-info);
  }
`;

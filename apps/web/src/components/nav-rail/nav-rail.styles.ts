import { css } from "lit";

export const NavRailStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    width: var(--nav-rail-width, 72px);
    background: var(--color-bg-elevated);
    border-right: 1px solid var(--color-bg-overlay);
    flex-shrink: 0;
    height: 100vh;
    position: sticky;
    top: 0;
  }

  .rail-top {
    padding: var(--space-4) var(--space-2);
    border-bottom: 1px solid var(--color-bg-overlay);
    display: flex;
    justify-content: center;
  }

  .logo {
    width: 40px;
    height: 40px;
    background: var(--color-brand);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    cursor: default;
    user-select: none;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-2);
    flex: 1;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-2) var(--space-1);
    border-radius: var(--radius-md);
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    font-family: var(--font-sans);
    font-weight: var(--weight-medium);
    transition:
      color var(--duration-fast),
      background var(--duration-fast);
    width: 100%;
  }
  .nav-item:hover {
    background: var(--color-bg-overlay);
    color: var(--color-text-secondary);
  }
  .nav-item.active {
    background: color-mix(in srgb, var(--color-brand) 20%, transparent);
    color: var(--color-brand);
  }
  .nav-icon {
    font-size: 18px;
    line-height: 1;
  }

  .rail-bottom {
    padding: var(--space-3) var(--space-2);
    border-top: 1px solid var(--color-bg-overlay);
  }

  .logout-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--space-2) var(--space-1);
    border-radius: var(--radius-md);
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    font-family: var(--font-sans);
    font-weight: var(--weight-medium);
    width: 100%;
    transition:
      color var(--duration-fast),
      background var(--duration-fast);
  }
  .logout-btn:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
`;

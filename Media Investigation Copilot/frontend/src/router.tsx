import { useSyncExternalStore } from "react";

/**
 * Minimal client-side router — no external dependencies.
 * Reads window.location.pathname and re-renders on navigation.
 */

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getSnapshot() {
  return window.location.pathname;
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => "/");
}

export function navigate(to: string) {
  if (to === window.location.pathname) return;
  window.history.pushState({}, "", to);
  notify();
}

/** Anchor that navigates client-side without a full page reload. */
export function Link({
  to,
  className,
  children
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

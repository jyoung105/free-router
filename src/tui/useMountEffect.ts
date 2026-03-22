import { useEffect } from "react";

/**
 * Run a callback once on mount (and optional cleanup on unmount).
 * This is the only place in the TUI layer where a raw useEffect is allowed.
 */
export function useMountEffect(effect: () => void | (() => void)): void {
  useEffect(effect, []);
}

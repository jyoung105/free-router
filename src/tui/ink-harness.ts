// src/tui/ink-harness.ts — Manages transitions between raw ANSI mode and Ink rendering.
// Used for mid-session flows (settings, target picker) that need to exit alt screen,
// run an Ink sub-app, then restore the main TUI.

import type { ReactElement } from "react";
import { PassThrough } from "node:stream";

export interface InkSubAppHooks {
  /** Called before Ink mounts. Must: detach onData, clear timers, exit alt screen, stop ping loop. */
  beforeMount: () => void;
  /** Called after Ink unmounts. Must: restore alt screen, raw mode, onData, ping loop, re-render. */
  afterUnmount: () => void;
}

/**
 * Run an Ink sub-application and return its result.
 *
 * Uses a proxy stdin stream so Ink never touches process.stdin directly.
 * This prevents Ink's unmount from corrupting the Node.js stream state
 * (it switches stdin to 'readable' mode which can't be cleanly reverted to 'data' mode).
 */
export async function runInkSubApp<T>(
  createElement: (resolve: (val: T) => void) => ReactElement,
  hooks: InkSubAppHooks,
): Promise<T> {
  hooks.beforeMount();

  const { render } = await import("ink");

  // Create a proxy stdin that Ink can own without corrupting process.stdin.
  // Pipe real stdin through it; on unmount just destroy the proxy.
  const proxyStdin = new PassThrough() as PassThrough & {
    isTTY: boolean;
    setRawMode: (mode: boolean) => void;
    ref: () => void;
    unref: () => void;
  };
  proxyStdin.isTTY = true;
  proxyStdin.setRawMode = () => {}; // no-op; we manage raw mode ourselves
  proxyStdin.ref = () => {}; // no-op; PassThrough doesn't have ref/unref
  proxyStdin.unref = () => {};

  // Forward real stdin data to the proxy
  const forwarder = (chunk: Buffer) => {
    proxyStdin.write(chunk);
  };
  process.stdin.on("data", forwarder);
  process.stdin.setEncoding("utf8");
  try {
    process.stdin.setRawMode(true);
  } catch {
    /* best-effort */
  }
  process.stdin.resume();

  return new Promise<T>((outerResolve) => {
    const element = createElement((val: T) => {
      // Stop forwarding, destroy proxy, unmount Ink
      process.stdin.removeListener("data", forwarder);
      proxyStdin.destroy();
      instance.unmount();
      hooks.afterUnmount();
      outerResolve(val);
    });

    const instance = render(element, {
      exitOnCtrlC: false,
      stdin: proxyStdin as any,
    });
  });
}

/** The preload script's contextBridge surface — the only thing the renderer
 *  can reach. `contextIsolation` stays on; there is no `nodeIntegration`. */
declare global {
  interface Window {
    hanzo?: { call(cmd: string, args?: unknown): Promise<any> };
  }
}

/** True inside the Electron window, false in the browser preview. */
export const isNative = typeof window !== "undefined" && !!window.hanzo;

/**
 * The ONE seam between the main process and the browser — the same contract
 * the Tauri templates use, so `app.tsx` is identical across both shells.
 *
 * A native app cannot be iframed, so every template also builds for the web,
 * and the web build runs the *same* UI through the fallbacks below.
 */
export function bridge<M extends Record<string, (a: any) => any>>(web: M) {
  return function call<K extends keyof M & string>(
    cmd: K,
    args?: Parameters<M[K]>[0],
  ): Promise<Awaited<ReturnType<M[K]>>> {
    return isNative
      ? window.hanzo!.call(cmd, args)
      : Promise.resolve(web[cmd](args as any));
  };
}

/** Frameless window controls — `frame: false` means the titlebar in shell.tsx
 *  IS the chrome, so the traffic lights go back over the same one channel. */
export async function winctl(k: "close" | "minimize" | "toggleMaximize") {
  if (isNative) await window.hanzo!.call("winctl", { k });
}

export {};

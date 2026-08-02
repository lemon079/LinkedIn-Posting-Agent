import { useSyncExternalStore } from "react";

export function isDesktopApp(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as Record<string, unknown>;
  return (
    "__TAURI_INTERNALS__" in win ||
    "__TAURI__" in win ||
    "__TAURI_POST_MESSAGE__" in win ||
    typeof win.__TAURI_IPC__ !== "undefined"
  );
}

const emptySubscribe = () => () => {};

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => isDesktopApp(),
    () => false
  );
}

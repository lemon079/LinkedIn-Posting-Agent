import { useState, useEffect } from "react";

export function isDesktopApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "__TAURI_INTERNALS__" in window ||
    "__TAURI__" in window ||
    "__TAURI_POST_MESSAGE__" in window ||
    typeof (window as any).__TAURI_IPC__ !== "undefined"
  );
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(isDesktopApp());
  }, []);

  return isDesktop;
}

import { isDesktopApp } from "../lib/desktop";

describe("isDesktopApp", () => {
  afterEach(() => {
    delete (global as unknown as { window?: unknown }).window;
  });

  test("returns false when window is undefined", () => {
    expect(isDesktopApp()).toBe(false);
  });

  test("returns false when window has no Tauri properties", () => {
    (global as unknown as { window: unknown }).window = {};
    expect(isDesktopApp()).toBe(false);
  });

  test("returns true when __TAURI_INTERNALS__ exists", () => {
    (global as unknown as { window: unknown }).window = { __TAURI_INTERNALS__: {} };
    expect(isDesktopApp()).toBe(true);
  });

  test("returns true when __TAURI__ exists", () => {
    (global as unknown as { window: unknown }).window = { __TAURI__: {} };
    expect(isDesktopApp()).toBe(true);
  });
});

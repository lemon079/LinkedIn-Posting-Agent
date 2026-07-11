import { promises as fs } from "fs";
import path from "path";

const HISTORY_FILE_PATH = path.resolve(process.cwd(), ".data", "recent-hooks.json");
const MAX_HOOKS = 10;

async function ensureDataDirectory() {
  const dir = path.dirname(HISTORY_FILE_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

export async function getRecentHooks(): Promise<string[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(HISTORY_FILE_PATH, "utf-8");
    const hooks = JSON.parse(data);
    if (Array.isArray(hooks)) {
      return hooks;
    }
    return [];
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    console.error("[HistoryService] Failed to read recent hooks:", error);
    return [];
  }
}

export async function addHook(hook: string): Promise<void> {
  try {
    const currentHooks = await getRecentHooks();
    const updatedHooks = [hook, ...currentHooks].slice(0, MAX_HOOKS);
    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(updatedHooks, null, 2), "utf-8");
  } catch (error) {
    console.error("[HistoryService] Failed to save hook:", error);
  }
}

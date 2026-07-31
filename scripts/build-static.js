const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const apiDir = path.join(process.cwd(), "src", "app", "api");
const backupDir = path.join(process.cwd(), "src", "app_api_backup");

let backedUp = false;

try {
  if (fs.existsSync(apiDir)) {
    try {
      fs.renameSync(apiDir, backupDir);
      backedUp = true;
    } catch {
      fs.cpSync(apiDir, backupDir, { recursive: true });
      fs.rmSync(apiDir, { recursive: true, force: true });
      backedUp = true;
    }
    console.log("✓ Temporarily backed up api/ routes.");
  }

  console.log("⚙ Running static next build...");
  execSync("npx next build", { stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_EXPORT: "true" } });
  console.log("✓ Static build completed successfully.");

} catch (err) {
  console.error("❌ Build failed:", err);
  process.exitCode = 1;
} finally {
  if (backedUp && fs.existsSync(backupDir)) {
    if (!fs.existsSync(apiDir)) {
      try {
        fs.renameSync(backupDir, apiDir);
      } catch {
        fs.cpSync(backupDir, apiDir, { recursive: true });
        fs.rmSync(backupDir, { recursive: true, force: true });
      }
    } else {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    console.log("✓ Restored api/ routes from backup folder.");
  }
}

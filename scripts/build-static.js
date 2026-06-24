const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const apiDir = path.join(process.cwd(), "src", "app", "api");
const backupDir = path.join(process.cwd(), "src", "app_api_backup");

let backedUp = false;

try {
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, backupDir);
    backedUp = true;
    console.log("✓ Temporarily moved api/ routes to backup folder.");
  }

  console.log("⚙ Running static next build...");
  execSync("npx next build", { stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_EXPORT: "true" } });
  console.log("✓ Static build completed successfully.");

} catch (err) {
  console.error("❌ Build failed:", err);
  process.exitCode = 1;
} finally {
  if (backedUp && fs.existsSync(backupDir)) {
    fs.renameSync(backupDir, apiDir);
    console.log("✓ Restored api/ routes from backup folder.");
  }
}

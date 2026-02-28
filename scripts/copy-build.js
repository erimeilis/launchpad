import { cpSync, mkdirSync, rmSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_DIR = resolve(ROOT, "src-tauri/target/release/bundle");
const BUILD_DIR = resolve(ROOT, "build");

// Clean and recreate build/
rmSync(BUILD_DIR, { recursive: true, force: true });
mkdirSync(BUILD_DIR, { recursive: true });

// Copy .app
const macosDir = resolve(BUNDLE_DIR, "macos");
for (const entry of readdirSync(macosDir)) {
  if (entry.endsWith(".app")) {
    cpSync(resolve(macosDir, entry), resolve(BUILD_DIR, entry), {
      recursive: true,
    });
    console.log(`  ✓ ${entry}`);
  }
}

// Copy .dmg
const dmgDir = resolve(BUNDLE_DIR, "dmg");
for (const entry of readdirSync(dmgDir)) {
  if (entry.endsWith(".dmg")) {
    cpSync(resolve(dmgDir, entry), resolve(BUILD_DIR, entry));
    console.log(`  ✓ ${entry}`);
  }
}

console.log(`\n  Build artifacts copied to build/`);

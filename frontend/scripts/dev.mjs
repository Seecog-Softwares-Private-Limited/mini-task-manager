/**
 * Run Next dev with repo-root `properties.env` loaded first (override: true).
 * Avoid relying on `frontend/.env` / `.env.local` for app configuration.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, "..");
const repoRoot = path.join(frontendRoot, "..");
const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");

const { ensureDevNextCache } = require("./ensure-dev-next-cache.cjs");
ensureDevNextCache(frontendRoot);

dotenv.config({ path: path.join(repoRoot, "properties.env"), override: true });

const port = process.env.FRONTEND_PORT || "3001";

if (!fs.existsSync(nextBin)) {
  console.error(
    "[frontend] Next.js is not installed. Run from repo root:\n  cd frontend && npm install",
  );
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  cwd: frontendRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));

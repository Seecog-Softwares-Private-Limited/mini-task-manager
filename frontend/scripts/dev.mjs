/**
 * Run Next dev with repo-root `properties.env` loaded first (override: true).
 * Avoid relying on `frontend/.env` / `.env.local` for app configuration.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, "..");
const repoRoot = path.join(frontendRoot, "..");

dotenv.config({ path: path.join(repoRoot, "properties.env"), override: true });

const port = process.env.FRONTEND_PORT || "3001";

const child = spawn("npx", ["next", "dev", "-p", port], {
  cwd: frontendRoot,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));

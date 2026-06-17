/**
 * Run Next dev with repo-root `properties.env` loaded first (override: true).
 * Avoid relying on `frontend/.env` / `.env.local` for app configuration.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import net from "node:net";
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

const apiPort = process.env.PORT || "3000";
const frontendPort = process.env.FRONTEND_PORT || "3001";
process.env.MINI_TM_BACKEND_URL =
  process.env.MINI_TM_BACKEND_URL || `http://127.0.0.1:${apiPort}`;

function isPortOpen(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  if (!fs.existsSync(nextBin)) {
    console.error(
      "[frontend] Next.js is not installed. Run from repo root:\n  cd frontend && npm install",
    );
    process.exit(1);
  }

  const backendUp = await isPortOpen("127.0.0.1", parseInt(apiPort, 10));
  if (!backendUp) {
    console.warn(
      `[frontend] Nest API is not listening on ${process.env.MINI_TM_BACKEND_URL}.`,
    );
    console.warn(
      "[frontend] API calls will fail with ECONNRESET until you start the backend:",
    );
    console.warn("  node app.js   (from repo root — starts API + frontend together)");
    console.warn(`  or npm run start:dev   (API only on port ${apiPort})`);
  }

  const child = spawn(process.execPath, [nextBin, "dev", "-p", frontendPort], {
    cwd: frontendRoot,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => process.exit(code ?? 0));
}

main();

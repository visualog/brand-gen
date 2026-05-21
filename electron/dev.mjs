#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const electronAppDir = path.join(rootDir, "electron");
const nextPort = Number(process.env.PORT || 3000);
const workerPort = Number(process.env.BRANDGEN_CODEX_WORKER_PORT || 4317);
const shouldReuseNext = process.env.BRANDGEN_ELECTRON_REUSE_NEXT === "1";
const shouldReuseWorker = process.env.BRANDGEN_ELECTRON_REUSE_WORKER === "1";
const children = new Set();

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 60000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (await isPortOpen(port, host)) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${host}:${port}`));
        return;
      }
      setTimeout(tick, 500);
    };
    void tick();
  });
}

async function isHttpReady(port, host = "127.0.0.1") {
  try {
    const response = await fetch(`http://${host}:${port}/`, {
      signal: AbortSignal.timeout(2500),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitForHttp(port, host = "127.0.0.1", timeoutMs = 90000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (await isHttpReady(port, host)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for http://${host}:${port}/`);
}

async function findAvailablePort(preferredPort, host = "127.0.0.1") {
  for (let port = preferredPort; port < preferredPort + 20; port += 1) {
    if (!(await isPortOpen(port, host))) return port;
  }
  throw new Error(`No available port found near ${preferredPort}`);
}

function spawnChild(label, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...options.env },
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && options.shutdownOnExit) {
      console.log(`[electron:dev] ${label} exited; shutting down owned services`);
      shutdown(code === 0 || code === null ? 0 : 1);
      return;
    }
    if (!shuttingDown && code !== 0) {
      console.error(`[electron:dev] ${label} exited`, { code, signal });
      shutdown(1);
    }
  });
  child.once("error", (error) => {
    children.delete(child);
    console.error(`[electron:dev] ${label} failed`, error);
    shutdown(1);
  });
  return child;
}

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill();
  }
  setTimeout(() => process.exit(exitCode), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  let activeWorkerPort = workerPort;
  if (shouldReuseWorker && (await isPortOpen(workerPort))) {
    console.log(`[electron:dev] using existing codex-worker on 127.0.0.1:${workerPort}`);
  } else {
    if (await isPortOpen(workerPort)) {
      activeWorkerPort = await findAvailablePort(workerPort + 1);
      console.log(
        `[electron:dev] worker port ${workerPort} is occupied; starting owned codex-worker on ${activeWorkerPort}`,
      );
    }
    spawnChild("codex-worker", process.execPath, ["scripts/codex-worker.mjs"], {
      env: { BRANDGEN_CODEX_WORKER_PORT: String(activeWorkerPort) },
    });
    await waitForPort(activeWorkerPort);
  }

  let activeNextPort = nextPort;
  if (shouldReuseNext && (await isHttpReady(nextPort))) {
    console.log(`[electron:dev] using existing Next server on http://127.0.0.1:${nextPort}`);
  } else {
    if (await isPortOpen(nextPort)) {
      activeNextPort = await findAvailablePort(nextPort + 1);
      console.log(
        `[electron:dev] port ${nextPort} is occupied; starting Electron-owned Next on ${activeNextPort}`,
      );
    }
    spawnChild("next", npmCommand(), ["run", "dev:next"], {
      env: {
        PORT: String(activeNextPort),
        HOSTNAME: "127.0.0.1",
        BRANDGEN_CODEX_WORKER_URL: `http://127.0.0.1:${activeWorkerPort}`,
      },
    });
    await waitForHttp(activeNextPort);
  }

  const appUrl = `http://127.0.0.1:${activeNextPort}`;
  const electronBin = path.join(
    rootDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "electron.cmd" : "electron",
  );
  spawnChild("electron", electronBin, [electronAppDir], {
    env: { BRANDGEN_ELECTRON_URL: appUrl },
    shutdownOnExit: true,
  });
}

main().catch((error) => {
  console.error("[electron:dev]", error);
  shutdown(1);
});

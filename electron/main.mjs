import { app, BrowserWindow, shell } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_NEXT_PORT = Number(process.env.PORT || 3000);
const DEFAULT_WORKER_PORT = Number(process.env.BRANDGEN_CODEX_WORKER_PORT || 4317);
const CHROME_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";

let mainWindow = null;
const children = new Set();
let shuttingDown = false;

app.setName("BrandGen");

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

async function waitForPort(port, host = "127.0.0.1", timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= timeoutMs) {
    if (await isPortOpen(port, host)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${host}:${port}`);
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
  for (let port = preferredPort; port < preferredPort + 50; port += 1) {
    if (!(await isPortOpen(port, host))) return port;
  }
  throw new Error(`No available port found near ${preferredPort}`);
}

function spawnNode(label, scriptPath, env = {}) {
  const child = spawn(process.execPath, [scriptPath], {
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      ...env,
    },
  });

  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (!shuttingDown && code !== 0) {
      console.error(`[electron] ${label} exited`, { code, signal });
    }
  });
  child.once("error", (error) => {
    children.delete(child);
    console.error(`[electron] ${label} failed`, error);
  });

  return child;
}

function shutdownChildren() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill();
  }
}

async function startPackagedServices() {
  const resourcesDir = process.resourcesPath;
  const dataDir = path.join(app.getPath("userData"), "data");
  const codexWorkdir = path.join(app.getPath("userData"), "codex-workdir");
  const workerPort = await findAvailablePort(DEFAULT_WORKER_PORT);
  const nextPort = await findAvailablePort(DEFAULT_NEXT_PORT);
  const workerScriptPath = path.join(resourcesDir, "codex-worker.mjs");
  const nextServerPath = path.join(resourcesDir, "next", "server.js");

  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(codexWorkdir, { recursive: true });

  spawnNode("codex-worker", workerScriptPath, {
    BRANDGEN_CODEX_WORKER_PORT: String(workerPort),
    BRANDGEN_CODEX_CWD: codexWorkdir,
  });
  await waitForPort(workerPort);

  spawnNode("next-server", nextServerPath, {
    NODE_ENV: "production",
    PORT: String(nextPort),
    HOSTNAME: "127.0.0.1",
    BRANDGEN_CODEX_WORKER_URL: `http://127.0.0.1:${workerPort}`,
    BRANDGEN_DATA_DIR: dataDir,
  });
  await waitForHttp(nextPort);

  return `http://127.0.0.1:${nextPort}`;
}

function createMainWindow(appUrl) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 720,
    title: "BrandGen",
    backgroundColor: "#09090b",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(appUrl)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    console.error("[electron] failed to load", {
      errorCode,
      errorDescription,
      validatedUrl,
    });
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log("[electron:renderer]", { level, message, line, sourceId });
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[electron] loaded", appUrl);
  });

  void mainWindow.loadURL(appUrl, { userAgent: CHROME_USER_AGENT });
}

app.whenReady().then(async () => {
  const appUrl = process.env.BRANDGEN_ELECTRON_URL || (await startPackagedServices());
  createMainWindow(appUrl);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(appUrl);
    }
  });
});

app.on("before-quit", shutdownChildren);

app.on("window-all-closed", () => {
  shutdownChildren();
  app.quit();
});

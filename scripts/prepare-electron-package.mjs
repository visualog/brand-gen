#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const staticSourceDir = path.join(rootDir, ".next", "static");
const staticTargetDir = path.join(standaloneDir, ".next", "static");
const publicSourceDir = path.join(rootDir, "public");
const publicTargetDir = path.join(standaloneDir, "public");
const localDataDir = path.join(standaloneDir, ".brandgen");

async function copyIfExists(source, target) {
  try {
    await fs.access(source);
  } catch {
    return;
  }

  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
}

await copyIfExists(staticSourceDir, staticTargetDir);
await copyIfExists(publicSourceDir, publicTargetDir);
await fs.rm(localDataDir, { recursive: true, force: true });

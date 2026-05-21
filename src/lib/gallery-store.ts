import fs from "node:fs/promises";
import path from "node:path";

export type GalleryStorePayload = {
  theme?: "light" | "dark";
  generatedResults?: unknown[];
  draft?: unknown;
  updatedAt?: string;
};

const DATA_DIR = process.env.BRANDGEN_DATA_DIR || path.join(process.cwd(), ".brandgen");
const STORE_PATH = path.join(DATA_DIR, "gallery.json");

export async function readGalleryStore(): Promise<GalleryStorePayload> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as GalleryStorePayload;
    return {
      theme: parsed.theme,
      generatedResults: Array.isArray(parsed.generatedResults) ? parsed.generatedResults : [],
      draft: parsed.draft,
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { generatedResults: [] };
    }
    throw error;
  }
}

export async function writeGalleryStore(payload: GalleryStorePayload) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const normalized: GalleryStorePayload = {
    theme: payload.theme,
    generatedResults: Array.isArray(payload.generatedResults) ? payload.generatedResults : [],
    draft: payload.draft,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(STORE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

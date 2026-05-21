import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export interface PromptBuildResult {
  enhancedPrompt: string;
  styleKeywords: string[];
  negativePrompt: string;
  technicalTags: string[];
}

export interface GeneratedImageResult {
  threadId: string;
  filePath: string;
  dataUrl: string;
}

interface CodexEvent {
  type?: string;
  thread_id?: string;
  item?: {
    type?: string;
    text?: string;
  };
}

interface RunCodexExecOptions {
  timeoutMs?: number;
  imagePaths?: string[];
}

const CODEX_BIN = process.env.CODEX_BIN || "/usr/local/bin/codex";
const CODEX_WORKDIR =
  process.env.BRANDGEN_CODEX_CWD ||
  process.env.INIT_CWD ||
  process.cwd();

const BRAND_STYLE_CONTEXT = `
You are a brand design prompt engineer for BrandGen, specializing in "Plus X" illustration style.

STYLE RULES:
- Premium hand-drawn branding illustration, slightly irregular human-like lines
- Soft muted pastel color palette, gentle light source from upper left
- Subtle analog textures (watercolor/crayon), generous negative space
- Minimalist corporate editorial aesthetic

FORBIDDEN: photorealistic, 3D render, neon colors, high contrast, text, watermark, logo, complex backgrounds
`;

function stripCodeFences(text: string): string {
  return text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

function parseJsonLines(stdout: string): CodexEvent[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CodexEvent);
}

function extractLastAgentMessage(events: CodexEvent[]): string {
  const messages = events.filter(
    (event) => event.type === "item.completed" && event.item?.type === "agent_message",
  );
  return messages.at(-1)?.item?.text?.trim() || "";
}

function extractThreadId(events: CodexEvent[]): string | null {
  return events.find((event) => event.type === "thread.started")?.thread_id ?? null;
}

function eventsContainCompletedTurn(events: CodexEvent[]): boolean {
  return events.some((event) => event.type === "turn.completed");
}

function resolutionToPixels(resolution: string): number {
  const resolutionMap: Record<string, number> = {
    SD: 512,
    HD: 1024,
    "4K": 2048,
    "8K": 2048,
  };
  return resolutionMap[resolution] ?? 1024;
}

function buildBaseImagePrompt(body: string): string {
  return [
    "premium hand-drawn branding illustration",
    "Plus X style",
    "slightly irregular human-like lines",
    "soft muted pastel color palette",
    "gentle light source from upper left",
    "subtle analog textures",
    "generous negative space",
    "minimalist corporate editorial aesthetic",
    body,
  ]
    .join(", ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function filePathToDataUrl(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : "image/png";
  const base64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function findLatestGeneratedImage(threadId: string): string | null {
  const generatedDir = path.join(os.homedir(), ".codex", "generated_images", threadId);

  if (!fs.existsSync(generatedDir)) {
    return null;
  }

  const files = fs
    .readdirSync(generatedDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(generatedDir, entry.name))
    .filter((filePath) => /\.(png|jpe?g|webp)$/i.test(filePath))
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return files[0]?.filePath ?? null;
}

async function runCodexExec(
  prompt: string,
  options: RunCodexExecOptions = {},
): Promise<string> {
  const { timeoutMs = 60000, imagePaths = [] } = options;

  return new Promise((resolve, reject) => {
    const imageArgs = imagePaths.flatMap((imagePath) => ["-i", imagePath]);
    const proc = spawn(
      CODEX_BIN,
      [
        "exec",
        "--json",
        "--skip-git-repo-check",
        "--ignore-rules",
        "-C",
        CODEX_WORKDIR,
        "--sandbox",
        "read-only",
        ...imageArgs,
        "--",
        prompt,
      ],
      {
        cwd: CODEX_WORKDIR,
        env: { ...process.env, TERM: "xterm-256color" },
      },
    );
    proc.stdin.end();

    let stdout = "";
    let stderr = "";
    const timeoutHandle = setTimeout(() => {
      proc.kill();
      reject(new Error("Codex CLI 응답 시간 초과"));
    }, timeoutMs);

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutHandle);

      if (code !== 0) {
        reject(new Error(`Codex CLI 실행 실패 (code: ${code}): ${stderr.trim() || stdout.trim()}`));
        return;
      }

      try {
        const events = parseJsonLines(stdout);
        const finalMessage = extractLastAgentMessage(events);
        if (!finalMessage) {
          reject(new Error("Codex CLI가 비어 있는 최종 응답을 반환했습니다."));
          return;
        }
        resolve(finalMessage);
      } catch (error) {
        reject(
          new Error(
            `Codex CLI 응답 파싱 실패: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });

    proc.on("error", (error: Error) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`Codex CLI 실행 오류: ${error.message}`));
    });
  });
}

async function runCodexExecForImageGeneration(
  prompt: string,
  timeoutMs = 120000,
): Promise<{ threadId: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      CODEX_BIN,
      [
        "exec",
        "--json",
        "--skip-git-repo-check",
        "--ignore-rules",
        "-C",
        CODEX_WORKDIR,
        "--sandbox",
        "read-only",
        "--",
        prompt,
      ],
      {
        cwd: CODEX_WORKDIR,
        env: { ...process.env, TERM: "xterm-256color" },
      },
    );
    proc.stdin.end();

    let stdout = "";
    let stderr = "";
    const timeoutHandle = setTimeout(() => {
      proc.kill();
      reject(new Error("Codex CLI 이미지 생성 시간 초과"));
    }, timeoutMs);

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutHandle);

      if (code !== 0) {
        reject(new Error(`Codex CLI 이미지 생성 실패 (code: ${code}): ${stderr.trim() || stdout.trim()}`));
        return;
      }

      try {
        const events = parseJsonLines(stdout);
        const threadId = extractThreadId(events);
        if (!threadId) {
          reject(new Error("Codex CLI 이미지 생성 응답에서 thread_id를 찾지 못했습니다."));
          return;
        }
        if (!eventsContainCompletedTurn(events)) {
          reject(new Error("Codex CLI 이미지 생성 응답에 turn.completed 이벤트가 없습니다."));
          return;
        }
        resolve({ threadId });
      } catch (error) {
        reject(
          new Error(
            `Codex CLI 이미지 생성 응답 파싱 실패: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    });

    proc.on("error", (error: Error) => {
      clearTimeout(timeoutHandle);
      reject(new Error(`Codex CLI 실행 오류: ${error.message}`));
    });
  });
}

export async function buildPromptWithCodex(params: {
  userInput: string;
  style?: string | null;
  ratio?: string | null;
  resolution?: string | null;
}): Promise<PromptBuildResult> {
  const instruction = `
${BRAND_STYLE_CONTEXT}

Input: "${params.userInput}"
Style: ${params.style || "default"}
Ratio: ${params.ratio || "1:1"}
Resolution: ${params.resolution || "HD"}${
    params.resolution === "8K" || params.resolution === "4K"
      ? " Add 'ultra high resolution' to technicalTags."
      : ""
  }

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "enhancedPrompt": "...",
  "styleKeywords": ["...", "..."],
  "negativePrompt": "...",
  "technicalTags": ["...", "..."]
}
`.trim();

  const raw = await runCodexExec(instruction);
  const cleaned = stripCodeFences(raw);

  try {
    return JSON.parse(cleaned) as PromptBuildResult;
  } catch {
    console.error("Codex prompt JSON parse failed, raw output:", raw);
    return {
      enhancedPrompt: params.userInput,
      styleKeywords: ["hand-drawn", "branding illustration", "Plus X style"],
      negativePrompt: "photorealistic, 3D render, neon colors, text, watermark",
      technicalTags: ["high quality", "professional"],
    };
  }
}

export async function analyzeStyleWithCodex(imagePath: string): Promise<string> {
  const instruction = `
You are a brand design expert. Analyze the attached image and describe its visual style as a concise image generation prompt.

Focus on:
- drawing technique
- color palette
- texture and mood
- composition style

Return ONLY a single English prompt string in 2-4 sentences, with no JSON, no bullet points, and no explanation.
`.trim();

  const raw = await runCodexExec(instruction, {
    timeoutMs: 45000,
    imagePaths: [imagePath],
  });

  return raw
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

export function getPixelSize(
  resolution: string,
  ratio: string,
): { width: number; height: number } {
  const base = resolutionToPixels(resolution);

  if (ratio === "16:9") return { width: base, height: Math.round(base * (9 / 16)) };
  if (ratio === "9:16") return { width: Math.round(base * (9 / 16)), height: base };
  if (ratio === "4:3") return { width: base, height: Math.round(base * (3 / 4)) };
  if (ratio === "3:4") return { width: Math.round(base * (3 / 4)), height: base };
  return { width: base, height: base };
}

export async function generateImageWithCodex(params: {
  prebuiltPrompt?: string | null;
  prompt?: string | null;
  style?: string | null;
  ratio?: string | null;
  resolution?: string | null;
}): Promise<GeneratedImageResult> {
  const ratio = params.ratio || "1:1";
  const resolution = params.resolution || "HD";
  const { width, height } = getPixelSize(resolution, ratio);

  let promptBody = params.prebuiltPrompt?.trim() || "";
  if (!promptBody) {
    const buildResult = await buildPromptWithCodex({
      userInput: params.prompt || params.style || "",
      style: params.style,
      ratio,
      resolution,
    });
    promptBody = [
      buildResult.enhancedPrompt,
      ...buildResult.styleKeywords,
      ...buildResult.technicalTags,
    ].join(", ");
  }

  const fullPrompt = buildBaseImagePrompt(promptBody);
  const generationInstruction = `
Generate one image from this prompt.

IMAGE PROMPT:
${fullPrompt}

REQUIREMENTS:
- aspect ratio: ${ratio}
- target size: ${width}x${height}
- no text, watermark, or logo
- return the generated image as the normal Codex image-generation result
`.trim();

  const { threadId } = await runCodexExecForImageGeneration(generationInstruction, 240000);
  const filePath = findLatestGeneratedImage(threadId);

  if (!filePath) {
    throw new Error("생성된 이미지 파일을 ~/.codex/generated_images 에서 찾지 못했습니다.");
  }

  return {
    threadId,
    filePath,
    dataUrl: filePathToDataUrl(filePath),
  };
}

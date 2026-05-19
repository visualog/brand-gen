#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";

const PORT = Number(process.env.BRANDGEN_CODEX_WORKER_PORT || 4317);
const CODEX_BIN = process.env.CODEX_BIN || "/usr/local/bin/codex";
const CODEX_WORKDIR =
  process.env.BRANDGEN_CODEX_CWD || process.cwd();

const BRAND_STYLE_CONTEXT = `
You are a brand design prompt engineer for BrandGen, specializing in "Plus X" illustration style.

STYLE RULES:
- Premium hand-drawn branding illustration, slightly irregular human-like lines
- Soft muted pastel color palette, gentle light source from upper left
- Subtle analog textures (watercolor/crayon), generous negative space
- Minimalist corporate editorial aesthetic

FORBIDDEN: photorealistic, 3D render, neon colors, high contrast, text, watermark, logo, complex backgrounds
`;

let queue = Promise.resolve();

function logDebug(label, payload) {
  const timestamp = new Date().toISOString();
  console.log(`[codex-worker ${timestamp}] ${label}`, payload ?? "");
}

function enqueue(task) {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

function parseJsonLines(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function extractLastAgentMessage(events) {
  const messages = events.filter(
    (event) => event.type === "item.completed" && event.item?.type === "agent_message",
  );
  return messages.at(-1)?.item?.text?.trim() || "";
}

function extractThreadId(events) {
  return events.find((event) => event.type === "thread.started")?.thread_id ?? null;
}

function eventsContainCompletedTurn(events) {
  return events.some((event) => event.type === "turn.completed");
}

function stripCodeFences(text) {
  return text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

function resolutionToPixels(resolution) {
  const resolutionMap = { SD: 512, HD: 1024, "4K": 2048, "8K": 2048 };
  return resolutionMap[resolution] ?? 1024;
}

function getPixelSize(resolution, ratio) {
  const base = resolutionToPixels(resolution);
  if (ratio === "16:9") return { width: base, height: Math.round(base * (9 / 16)) };
  if (ratio === "9:16") return { width: Math.round(base * (9 / 16)), height: base };
  if (ratio === "4:3") return { width: base, height: Math.round(base * (3 / 4)) };
  if (ratio === "3:4") return { width: Math.round(base * (3 / 4)), height: base };
  return { width: base, height: base };
}

function buildBaseImagePrompt(body) {
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

function buildImagePrompt(body, { preserveStyleReference = false } = {}) {
  if (preserveStyleReference) {
    return [
      "premium brand illustration",
      "subject-focused composition",
      "brand-safe image",
      body,
    ]
      .join(", ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return buildBaseImagePrompt(body);
}

function filePathToDataUrl(filePath) {
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

function findLatestGeneratedImage(threadId) {
  const generatedDir = path.join(os.homedir(), ".codex", "generated_images", threadId);
  if (!fs.existsSync(generatedDir)) return null;

  const files = fs
    .readdirSync(generatedDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(generatedDir, entry.name))
    .filter((filePath) => /\.(png|jpe?g|webp)$/i.test(filePath))
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0]?.filePath ?? null;
}

function runCodexExec(prompt, { timeoutMs = 60000, imagePaths = [] } = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const imageArgs = imagePaths.flatMap((imagePath) => ["-i", imagePath]);
    logDebug("runCodexExec:start", {
      timeoutMs,
      imageCount: imagePaths.length,
      promptPreview: prompt.slice(0, 160),
    });
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
    const timer = setTimeout(() => {
      proc.kill();
      logDebug("runCodexExec:timeout", {
        elapsedMs: Date.now() - startedAt,
        stderrPreview: stderr.slice(-500),
      });
      reject(new Error("Codex CLI 응답 시간 초과"));
    }, timeoutMs);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      logDebug("runCodexExec:close", {
        code,
        elapsedMs: Date.now() - startedAt,
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
        stderrPreview: stderr.slice(-500),
      });
      if (code !== 0) {
        reject(new Error(`Codex CLI 실행 실패 (code: ${code}): ${stderr.trim() || stdout.trim()}`));
        return;
      }

      const events = parseJsonLines(stdout);
      logDebug("runCodexExec:events", {
        count: events.length,
        types: events.map((event) => event.type),
      });
      const finalMessage = extractLastAgentMessage(events);
      if (!finalMessage) {
        reject(new Error("Codex CLI가 비어 있는 최종 응답을 반환했습니다."));
        return;
      }
      resolve(finalMessage);
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Codex CLI 실행 오류: ${error.message}`));
    });
  });
}

function runCodexExecForImageGeneration(prompt, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    logDebug("runCodexExecForImageGeneration:start", {
      timeoutMs,
      promptPreview: prompt.slice(0, 200),
    });
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
    const timer = setTimeout(() => {
      proc.kill();
      logDebug("runCodexExecForImageGeneration:timeout", {
        elapsedMs: Date.now() - startedAt,
        stdoutPreview: stdout.slice(-500),
        stderrPreview: stderr.slice(-500),
      });
      reject(new Error("Codex CLI 이미지 생성 시간 초과"));
    }, timeoutMs);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      logDebug("runCodexExecForImageGeneration:close", {
        code,
        elapsedMs: Date.now() - startedAt,
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
        stdoutPreview: stdout.slice(-500),
        stderrPreview: stderr.slice(-500),
      });
      if (code !== 0) {
        reject(new Error(`Codex CLI 이미지 생성 실패 (code: ${code}): ${stderr.trim() || stdout.trim()}`));
        return;
      }

      const events = parseJsonLines(stdout);
      const threadId = extractThreadId(events);
      logDebug("runCodexExecForImageGeneration:events", {
        count: events.length,
        types: events.map((event) => event.type),
        threadId,
      });
      if (!threadId) {
        reject(new Error("Codex CLI 이미지 생성 응답에서 thread_id를 찾지 못했습니다."));
        return;
      }
      if (!eventsContainCompletedTurn(events)) {
        reject(new Error("Codex CLI 이미지 생성 응답에 turn.completed 이벤트가 없습니다."));
        return;
      }
      resolve({ threadId });
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`Codex CLI 실행 오류: ${error.message}`));
    });
  });
}

async function buildPromptWithCodex({ userInput, style, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel }) {
  const instruction = `
${BRAND_STYLE_CONTEXT}

Input: "${userInput}"
Style: ${style || "default"}
Composition: ${composition || "default"}
Background: ${background || "default"}
Constraints: ${constraints || "default"}
Mood: ${mood || "default"}
Palette: ${palette || "default"}
Camera Angle: ${cameraAngle || "default"}
Lighting: ${lighting || "default"}
Gesture: ${gesture || "default"}
Props: ${propsPrompt || "default"}
Detail Level: ${detailLevel || "default"}
Ratio: ${ratio || "1:1"}
Resolution: ${resolution || "HD"}${
    resolution === "8K" || resolution === "4K"
      ? " Add 'ultra high resolution' to technicalTags."
      : ""
  }

${style
    ? `
IMPORTANT STYLE RULE:
- The Style field is an exact reference prompt written by the user.
- Do NOT paraphrase, summarize, expand, soften, or replace the style.
- Do NOT move style details into enhancedPrompt.
- Keep enhancedPrompt focused on subject, action, composition, and scene only.
- Return styleKeywords as an empty array when a Style field is provided.
- technicalTags must stay generic and must not introduce a conflicting palette, linework, texture, or lighting style.
`
    : `
When no Style field is provided, you may apply the default BrandGen "Plus X" style direction.
`
  }

${composition
    ? `
IMPORTANT COMPOSITION RULE:
- Respect the Composition field exactly as a framing and staging instruction.
- Weave that framing into enhancedPrompt and technicalTags without replacing it.
`
    : ""
  }

${background
    ? `
IMPORTANT BACKGROUND RULE:
- Respect the Background field as the scene or empty-space instruction.
- Keep it compatible with the main subject and do not overcrowd the composition.
`
    : ""
  }

${constraints
    ? `
IMPORTANT CONSTRAINT RULE:
- Treat the Constraints field as strict requirements.
- Do not weaken or paraphrase away the listed prohibitions.
`
    : ""
  }

${mood
    ? `
IMPORTANT MOOD RULE:
- Reflect the Mood field in the emotional tone and pacing of the scene.
- Do not contradict the selected mood with unrelated atmosphere.
`
    : ""
  }

${palette
    ? `
IMPORTANT PALETTE RULE:
- Respect the Palette field exactly as the color direction.
- Do not introduce a conflicting palette in technicalTags.
`
    : ""
  }

${cameraAngle
    ? `
IMPORTANT CAMERA RULE:
- Respect the Camera Angle field as the viewing perspective.
- Keep the viewpoint readable and consistent with the chosen composition.
`
    : ""
  }

${lighting
    ? `
IMPORTANT LIGHTING RULE:
- Respect the Lighting field as the illumination style.
- Do not introduce contradictory light direction or shadow behavior.
`
    : ""
  }

${gesture
    ? `
IMPORTANT GESTURE RULE:
- Reflect the Gesture field through facial expression, posture, and body rhythm.
- Keep the motion and emotional cue visible in the main subject.
`
    : ""
  }

${propsPrompt
    ? `
IMPORTANT PROP RULE:
- Treat the Props field as a concrete prop requirement.
- Keep props visible, readable, and relevant to the main action.
`
    : ""
  }

${detailLevel
    ? `
IMPORTANT DETAIL RULE:
- Respect the Detail Level field as the complexity instruction.
- Match the number of secondary forms and textures to the requested density.
`
    : ""
  }

Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "enhancedPrompt": "...",
  "styleKeywords": ["...", "..."],
  "negativePrompt": "...",
  "technicalTags": ["...", "..."]
}

All returned string values must be written in natural English.
`.trim();

  const raw = await runCodexExec(instruction, { timeoutMs: 60000 });
  const cleaned = stripCodeFences(raw);
  logDebug("buildPromptWithCodex:raw", { rawPreview: raw.slice(0, 300) });
  return JSON.parse(cleaned);
}

async function analyzeStyleWithCodex(imagePath) {
  const instruction = `
Analyze the attached image and return only one short English style prompt for image generation.
Focus on drawing technique, palette, texture, mood, and composition.
No JSON. No bullets. No explanation.
`.trim();

  const raw = await runCodexExec(instruction, {
    timeoutMs: 45000,
    imagePaths: [imagePath],
  });

  return raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n+/g, " ").trim();
}

async function generateImageWithCodex({ prompt, style, ratio = "1:1", resolution = "HD", composition, background, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel, prebuiltPrompt }) {
  const { width, height } = getPixelSize(resolution, ratio);
  let promptBody = prebuiltPrompt?.trim() || "";

  if (!promptBody) {
    const buildResult = await buildPromptWithCodex({
      userInput: prompt || style || "",
      style,
      ratio,
      resolution,
      composition,
      background,
      constraints,
      mood,
      palette,
      cameraAngle,
      lighting,
      gesture,
      propsPrompt,
      detailLevel,
    });
    promptBody = [
      buildResult.enhancedPrompt,
      ...buildResult.styleKeywords,
      ...buildResult.technicalTags,
    ].join(", ");
  }

  const fullPrompt = buildImagePrompt(promptBody, {
    preserveStyleReference: Boolean(style),
  });
  logDebug("generateImageWithCodex:prompt", {
    ratio,
    resolution,
    width,
    height,
    usedPrebuiltPrompt: Boolean(prebuiltPrompt),
    promptPreview: fullPrompt.slice(0, 300),
  });
  const instruction = `
Generate one image from this prompt.

IMAGE PROMPT:
${fullPrompt}

REQUIREMENTS:
- aspect ratio: ${ratio}
- target size: ${width}x${height}
- no text, watermark, or logo
- return the generated image as the normal Codex image-generation result
`.trim();

  const { threadId } = await runCodexExecForImageGeneration(instruction, 240000);
  const filePath = findLatestGeneratedImage(threadId);
  logDebug("generateImageWithCodex:fileLookup", {
    threadId,
    generatedDir: path.join(os.homedir(), ".codex", "generated_images", threadId),
    filePath,
  });
  if (!filePath) {
    throw new Error("생성된 이미지 파일을 ~/.codex/generated_images 에서 찾지 못했습니다.");
  }

  return {
    url: filePathToDataUrl(filePath),
    threadId,
    filePath,
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error(`JSON 파싱 실패: ${error.message}`));
      }
    });
    req.on("error", reject);
  });
}

function writeJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function handleTranslate(payload) {
  const { prompt, style, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel } = payload;
  if (!prompt && !style && !ratio && !resolution && !composition && !background && !constraints && !mood && !palette && !cameraAngle && !lighting && !gesture && !propsPrompt && !detailLevel) {
    return { englishPrompt: "" };
  }

  const parts = [];
  if (prompt) {
    const result = await buildPromptWithCodex({
      userInput: prompt,
      style,
      ratio,
      resolution,
      composition,
      background,
      constraints,
      mood,
      palette,
      cameraAngle,
      lighting,
      gesture,
      propsPrompt,
      detailLevel,
    });
    if (result.enhancedPrompt) parts.push(result.enhancedPrompt);
    if (result.technicalTags?.length) parts.push(result.technicalTags.join(", "));
  }
  if (!prompt && composition) parts.push(composition);
  if (!prompt && background) parts.push(background);
  if (!prompt && constraints) parts.push(constraints);
  if (!prompt && mood) parts.push(mood);
  if (!prompt && palette) parts.push(palette);
  if (!prompt && cameraAngle) parts.push(cameraAngle);
  if (!prompt && lighting) parts.push(lighting);
  if (!prompt && gesture) parts.push(gesture);
  if (!prompt && propsPrompt) parts.push(propsPrompt);
  if (!prompt && detailLevel) parts.push(detailLevel);
  if (style) parts.push(style);
  if (!prompt) {
    if (ratio) parts.push(`${ratio} aspect ratio`);
    if (resolution) parts.push(`${resolution} resolution`);
  }

  return { englishPrompt: parts.join(". ").trim() };
}

async function handleAnalyzeStyle(payload) {
  let tmpFile = null;
  try {
    const { imageBase64, mimeType = "image/jpeg" } = payload;
    if (!imageBase64) {
      throw new Error("이미지가 필요합니다.");
    }
    const ext = mimeType.split("/")[1]?.split(";")[0] || "jpg";
    tmpFile = path.join(os.tmpdir(), `brandgen-style-${Date.now()}.${ext}`);
    const buffer = Buffer.from(imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");
    fs.writeFileSync(tmpFile, buffer);
    return { suggestedPrompt: await analyzeStyleWithCodex(tmpFile) };
  } finally {
    if (tmpFile) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
}

async function handleGenerate(payload) {
  const { prompt, style, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel, prebuiltPrompt } = payload;
  if (!prompt && !style && !prebuiltPrompt) {
    throw new Error("프롬프트 또는 스타일이 필요합니다.");
  }
  return generateImageWithCodex({ prompt, style, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel, prebuiltPrompt });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    writeJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  try {
    const payload = await readJsonBody(req);
    logDebug("request:start", { url: req.url, method: req.method });
    const result = await enqueue(async () => {
      if (req.url === "/translate") return handleTranslate(payload);
      if (req.url === "/analyze-style") return handleAnalyzeStyle(payload);
      if (req.url === "/generate") return handleGenerate(payload);
      throw new Error("Not Found");
    });

    logDebug("request:success", { url: req.url });
    writeJson(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    const status = message === "Not Found" ? 404 : 500;
    logDebug("request:error", { url: req.url, status, message });
    writeJson(res, status, { error: message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`BrandGen Codex worker listening on http://127.0.0.1:${PORT}`);
  console.log(`Using codex binary: ${CODEX_BIN}`);
  console.log(`Using workdir: ${CODEX_WORKDIR}`);
});

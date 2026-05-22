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

fs.mkdirSync(CODEX_WORKDIR, { recursive: true });

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

async function imageInputToBuffer(imageInput) {
  if (typeof imageInput !== "string" || !imageInput.trim()) {
    throw new Error("이미지가 필요합니다.");
  }

  if (/^https?:\/\//i.test(imageInput)) {
    const response = await fetch(imageInput, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`이미지 URL을 가져오지 못했습니다. (${response.status})`);
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      throw new Error("이미지 URL이 이미지 파일을 반환하지 않았습니다.");
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: contentType.split(";")[0],
    };
  }

  const mimeMatch = imageInput.match(/^data:([^;]+);base64,/);
  return {
    buffer: Buffer.from(imageInput.replace(/^data:[^;]+;base64,/, ""), "base64"),
    mimeType: mimeMatch?.[1] || "image/jpeg",
  };
}

function imageExtensionFromMimeType(mimeType) {
  const subtype = mimeType.split("/")[1]?.split(";")[0] || "jpeg";
  if (subtype === "jpeg") return "jpg";
  if (/^[a-z0-9]+$/i.test(subtype)) return subtype.toLowerCase();
  return "jpg";
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

async function buildPromptWithCodex({ userInput, style, characterReference, objectReference, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, objectAngle, lighting, gesture, propsPrompt, detailLevel }) {
  const instruction = `
${BRAND_STYLE_CONTEXT}

Input: "${userInput}"
Style: ${style || "default"}
Character Reference: ${characterReference || "default"}
Object Reference: ${objectReference || "default"}
Composition: ${composition || "default"}
Background: ${background || "default"}
Constraints: ${constraints || "default"}
Mood: ${mood || "default"}
Palette: ${palette || "default"}
Camera Angle: ${cameraAngle || "default"}
Object Angle: ${objectAngle || "default"}
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

${characterReference
    ? `
IMPORTANT CHARACTER CONSISTENCY RULE:
- Treat Character Reference as a non-negotiable identity lock, not loose inspiration.
- Preserve the same character appearance, outfit, proportions, distinctive features, and visual identity across generations.
- New action, pose, camera angle, or composition may change, but identity-defining traits must not change.
- Do not replace, redesign, age-change, gender-swap, restyle, or simplify away the described character.
- If the user request conflicts with Character Reference, keep the reference identity and adapt only the pose or scene.
`
    : ""
  }

${objectReference
    ? `
IMPORTANT OBJECT CONSISTENCY RULE:
- Treat Object Reference as a non-negotiable product/prop identity lock, not loose inspiration.
- Preserve the same object silhouette, structure, color placement, material cues, and distinctive details across generations.
- New action, pose, camera angle, or composition may change, but object-defining traits must not change.
- Do not replace, redesign, recolor, simplify, or swap the object with a generic alternative.
- If the user request conflicts with Object Reference, keep the reference object and adapt only the scene.
`
    : ""
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

${objectAngle
    ? `
IMPORTANT OBJECT ANGLE RULE:
- Treat the Object Angle field as a strict orientation lock for the whole subject/object group.
- Include the orientation directly in enhancedPrompt using concrete view language, not only numeric yaw/pitch.
- Rotate the subject/product itself, not just the camera viewpoint or canvas framing.
- Add visible perspective cues: changed silhouette, foreshortening, visible side/rear/top/underside surfaces when requested.
- For bicycles, vehicles, packages, or props, the wheels/planes/edges must visibly change shape or overlap according to the locked orientation.
- Do not default back to a normal front-facing or side-profile object when Object Angle requests a three-quarter, rear, top-down, or low-angle orientation.
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

async function analyzeStyleWithCodex(imagePath, mode = "style") {
  const focus =
    mode === "character"
      ? "Focus on stable character identity: apparent age range, body proportions, hair, face-defining features, outfit, accessories, pose-independent traits, and what must stay consistent."
      : mode === "object"
        ? "Focus on stable object identity: silhouette, structure, color placement, material, proportions, markings, and distinctive details that must stay consistent."
        : "Focus on drawing technique, palette, texture, mood, and composition.";
  const instruction = `
Analyze the attached image and return only one short English ${mode} reference prompt for image generation.
${focus}
Write it as a fixed consistency reference that can be reused in future prompts.
No JSON. No bullets. No explanation.
`.trim();

  const raw = await runCodexExec(instruction, {
    timeoutMs: 45000,
    imagePaths: [imagePath],
  });

  return raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n+/g, " ").trim();
}

async function analyzeConsistencyWithCodex(imagePath, prompt = "") {
  const instruction = `
Analyze the generated image and extract reusable consistency elements for future image generation.

Original prompt:
${prompt || "not provided"}

Return ONLY a valid JSON object with this exact structure:
{
  "character": "stable character identity details that should stay consistent, or empty string if no character",
  "object": "stable object/product/prop identity details that should stay consistent, or empty string if no object",
  "style": "stable visual style, rendering, linework, color, texture, and mood details",
  "composition": "stable framing, scale, spacing, camera/object angle, and layout details",
  "rules": ["short rule that preserves consistency", "short rule that avoids unwanted drift"]
}

Rules:
- Use natural English for every value.
- Focus on reusable, concrete visual details only.
- Write character and object values as strict identity locks, not style suggestions.
- Include exact visible traits: silhouette, proportions, colors, outfit/material placement, accessories, and distinctive details.
- Include one anti-drift rule for what must not change in future generations.
- Do not invent details that are not visible.
- Keep each field concise but specific, usually 1-2 dense sentences per field.
- No markdown. No explanation.
`.trim();

  const raw = await runCodexExec(instruction, {
    timeoutMs: 60000,
    imagePaths: [imagePath],
  });
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);

  return {
    character: typeof parsed.character === "string" ? parsed.character.replace(/\s+/g, " ").trim() : "",
    object: typeof parsed.object === "string" ? parsed.object.replace(/\s+/g, " ").trim() : "",
    style: typeof parsed.style === "string" ? parsed.style.replace(/\s+/g, " ").trim() : "",
    composition: typeof parsed.composition === "string" ? parsed.composition.replace(/\s+/g, " ").trim() : "",
    rules: Array.isArray(parsed.rules)
      ? parsed.rules.filter((rule) => typeof rule === "string").map((rule) => rule.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 6)
      : [],
  };
}

async function translatePromptToKorean(englishPrompt) {
  if (!englishPrompt?.trim()) return "";

  const instruction = `
Translate the following image-generation prompt into natural Korean.

RULES:
- Keep the meaning exact.
- Preserve prompt semantics, subject details, composition, style, constraints, and technical qualifiers.
- Output plain Korean prose only.
- No markdown. No bullets. No explanation.

PROMPT:
${englishPrompt}
`.trim();

  const raw = await runCodexExec(instruction, { timeoutMs: 45000 });
  return raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n+/g, " ").trim();
}

async function generateDisplayTitle({ prompt, englishPrompt, koreanPrompt }) {
  const source = [koreanPrompt, prompt, englishPrompt].find((value) => typeof value === "string" && value.trim())?.trim();
  if (!source) return "새 브랜드 이미지";

  const instruction = `
Create one short Korean display title for an image card based on the source prompt below.

RULES:
- 2 to 6 Korean words.
- Natural and polished, like a gallery title.
- Focus on subject/action, not technical prompt wording.
- No quotes. No markdown. No explanation.
- Keep it under 24 characters when possible.

SOURCE:
${source}
`.trim();

  const raw = await runCodexExec(instruction, { timeoutMs: 45000 });
  const cleaned = raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n+/g, " ").trim();
  return cleaned || "새 브랜드 이미지";
}

async function generateMetadataForPrompt(englishPrompt) {
  const source = typeof englishPrompt === "string" ? englishPrompt.trim() : "";
  if (!source) {
    return { koreanPrompt: "", title: "새 브랜드 이미지" };
  }

  const instruction = `
Create metadata for an image-generation prompt and return ONLY valid JSON with this exact structure:
{
  "koreanPrompt": "...",
  "title": "..."
}

RULES:
- koreanPrompt must be natural Korean and preserve the full meaning of the source prompt.
- title must be 2 to 6 Korean words, polished and gallery-like.
- Keep title focused on the subject/action, not prompt mechanics.
- No markdown. No explanation.

SOURCE:
${source}
`.trim();

  const raw = await runCodexExec(instruction, { timeoutMs: 45000 });
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned);
  return {
    koreanPrompt: typeof parsed.koreanPrompt === "string" ? parsed.koreanPrompt.replace(/\s+/g, " ").trim() : "",
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.replace(/\s+/g, " ").trim() : "새 브랜드 이미지",
  };
}

async function generateImageWithCodex({ prompt, style, characterReference, objectReference, ratio = "1:1", resolution = "HD", composition, background, constraints, mood, palette, cameraAngle, objectAngle, lighting, gesture, propsPrompt, detailLevel, prebuiltPrompt }) {
  const { width, height } = getPixelSize(resolution, ratio);
  let promptBody = prebuiltPrompt?.trim() || "";

  if (
    promptBody &&
    objectAngle &&
    !promptBody.includes("OBJECT ORIENTATION LOCK") &&
    !promptBody.includes("mandatory object orientation")
  ) {
    promptBody = `${promptBody}, ${objectAngle}`;
  }
  if (promptBody && characterReference) {
    promptBody = `${promptBody}, CONSISTENCY LOCK - character identity must match exactly: ${characterReference}`;
  }
  if (promptBody && objectReference) {
    promptBody = `${promptBody}, CONSISTENCY LOCK - object identity must match exactly: ${objectReference}`;
  }

  if (!promptBody) {
    const buildResult = await buildPromptWithCodex({
      userInput: prompt || style || "",
      style,
      characterReference,
      objectReference,
      ratio,
      resolution,
      composition,
      background,
      constraints,
      mood,
      palette,
      cameraAngle,
      objectAngle,
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
  let metadata = { koreanPrompt: "", title: "새 브랜드 이미지" };
  try {
    metadata = await generateMetadataForPrompt(promptBody);
  } catch (error) {
    logDebug("generateImageWithCodex:metadataFallback", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
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
- if a CONSISTENCY LOCK is present, preserve those identity details over pose, scene, or composition variation
- do not redesign, simplify, recolor, swap, or reinterpret locked character/object identity details
- if an OBJECT ORIENTATION LOCK is present, make the final drawing visibly obey that orientation with foreshortening and changed silhouette, not a normal front or side profile
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
    englishPrompt: promptBody,
    koreanPrompt: metadata.koreanPrompt,
    title: metadata.title,
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
  const { prompt, style, characterReference, objectReference, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, objectAngle, lighting, gesture, propsPrompt, detailLevel } = payload;
  if (!prompt && !style && !characterReference && !objectReference && !ratio && !resolution && !composition && !background && !constraints && !mood && !palette && !cameraAngle && !objectAngle && !lighting && !gesture && !propsPrompt && !detailLevel) {
    return { englishPrompt: "" };
  }

  const parts = [];
  if (prompt) {
    const result = await buildPromptWithCodex({
      userInput: prompt,
      style,
      characterReference,
      objectReference,
      ratio,
      resolution,
      composition,
      background,
      constraints,
      mood,
      palette,
      cameraAngle,
      objectAngle,
      lighting,
      gesture,
      propsPrompt,
      detailLevel,
    });
    if (result.enhancedPrompt) parts.push(result.enhancedPrompt);
    if (result.technicalTags?.length) parts.push(result.technicalTags.join(", "));
  }
  if (!prompt && composition) parts.push(composition);
  if (characterReference) parts.push(`fixed character reference: ${characterReference}`);
  if (objectReference) parts.push(`fixed object reference: ${objectReference}`);
  if (!prompt && background) parts.push(background);
  if (!prompt && constraints) parts.push(constraints);
  if (!prompt && mood) parts.push(mood);
  if (!prompt && palette) parts.push(palette);
  if (!prompt && cameraAngle) parts.push(cameraAngle);
  if (!prompt && objectAngle) parts.push(objectAngle);
  if (!prompt && lighting) parts.push(lighting);
  if (!prompt && gesture) parts.push(gesture);
  if (!prompt && propsPrompt) parts.push(propsPrompt);
  if (!prompt && detailLevel) parts.push(detailLevel);
  if (style) parts.push(style);
  if (!prompt) {
    if (ratio) parts.push(`${ratio} aspect ratio`);
    if (resolution) parts.push(`${resolution} resolution`);
  }

  const englishPrompt = parts.join(". ").trim();
  return { englishPrompt };
}

async function handleTranslateKorean(payload) {
  const englishPrompt = typeof payload?.englishPrompt === "string" ? payload.englishPrompt.trim() : "";
  if (!englishPrompt) {
    return { koreanPrompt: "" };
  }

  const koreanPrompt = await translatePromptToKorean(englishPrompt);
  return { koreanPrompt };
}

async function handleGenerateTitle(payload) {
  const title = await generateDisplayTitle({
    prompt: typeof payload?.prompt === "string" ? payload.prompt : "",
    englishPrompt: typeof payload?.englishPrompt === "string" ? payload.englishPrompt : "",
    koreanPrompt: typeof payload?.koreanPrompt === "string" ? payload.koreanPrompt : "",
  });

  return { title };
}

async function handleAnalyzeStyle(payload) {
  let tmpFile = null;
  try {
    const { imageBase64, mimeType = "image/jpeg", mode = "style" } = payload;
    const imageData = await imageInputToBuffer(imageBase64);
    const ext = imageExtensionFromMimeType(imageData.mimeType || mimeType);
    tmpFile = path.join(os.tmpdir(), `brandgen-style-${Date.now()}.${ext}`);
    fs.writeFileSync(tmpFile, imageData.buffer);
    return { suggestedPrompt: await analyzeStyleWithCodex(tmpFile, mode) };
  } finally {
    if (tmpFile) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
}

async function handleAnalyzeConsistency(payload) {
  let tmpFile = null;
  try {
    const { imageBase64, prompt = "", mimeType = "image/jpeg" } = payload;
    const imageData = await imageInputToBuffer(imageBase64);
    const ext = imageExtensionFromMimeType(imageData.mimeType || mimeType);
    tmpFile = path.join(os.tmpdir(), `brandgen-consistency-${Date.now()}.${ext}`);
    fs.writeFileSync(tmpFile, imageData.buffer);
    return await analyzeConsistencyWithCodex(tmpFile, prompt);
  } finally {
    if (tmpFile) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }
}

async function handleGenerate(payload) {
  const { prompt, style, characterReference, objectReference, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, objectAngle, lighting, gesture, propsPrompt, detailLevel, prebuiltPrompt } = payload;
  if (!prompt && !style && !prebuiltPrompt) {
    throw new Error("프롬프트 또는 스타일이 필요합니다.");
  }
  return generateImageWithCodex({ prompt, style, characterReference, objectReference, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, objectAngle, lighting, gesture, propsPrompt, detailLevel, prebuiltPrompt });
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
      if (req.url === "/translate-korean") return handleTranslateKorean(payload);
      if (req.url === "/generate-title") return handleGenerateTitle(payload);
      if (req.url === "/analyze-style") return handleAnalyzeStyle(payload);
      if (req.url === "/analyze-consistency") return handleAnalyzeConsistency(payload);
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

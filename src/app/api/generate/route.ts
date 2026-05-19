// src/app/api/generate/route.ts
// Codex worker 이미지 생성 파이프라인
import { NextRequest, NextResponse } from "next/server";
import { generateViaWorker } from "@/lib/codex-worker-client";

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      style,
      ratio = "1:1",
      resolution = "HD",
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
      prebuiltPrompt,
    } = await req.json();

    if (!prompt && !style && !prebuiltPrompt) {
      return NextResponse.json({ error: "프롬프트 또는 스타일이 필요합니다." }, { status: 400 });
    }

    const result = await generateViaWorker({
      prompt,
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
      prebuiltPrompt,
    });

    console.log("✅ 이미지 생성 완료!");
    return NextResponse.json({
      url: result.url,
      threadId: result.threadId,
      filePath: result.filePath,
    });
  } catch (error: unknown) {
    console.error("Generation error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    const errorMessage =
      error instanceof Error && error.name === "TimeoutError"
        ? "이미지 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
        : message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// src/app/api/analyze-style/route.ts
// Codex worker로 이미지 스타일 분석
import { NextRequest, NextResponse } from "next/server";
import { analyzeStyleViaWorker } from "@/lib/codex-worker-client";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg", mode = "style" } = await req.json();
    const data = await analyzeStyleViaWorker({ imageBase64, mimeType, mode });
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Style analysis error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

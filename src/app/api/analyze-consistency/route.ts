import { NextRequest, NextResponse } from "next/server";
import { analyzeConsistencyViaWorker } from "@/lib/codex-worker-client";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, prompt = "", mimeType = "image/jpeg" } = await req.json();
    const data = await analyzeConsistencyViaWorker({ imageBase64, prompt, mimeType });
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Consistency analysis error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

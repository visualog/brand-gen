// src/app/api/translate/route.ts
// 설명(prompt)만 Codex worker로 번역/강화, 스타일 프롬프트는 사용자 작성 그대로 사용
import { NextResponse } from "next/server";
import { translateViaWorker } from "@/lib/codex-worker-client";

export async function POST(req: Request) {
  try {
    const { prompt, style, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel } = await req.json();

    // 아무것도 연결되지 않은 경우 빈 응답
    if (!prompt && !style && !ratio && !resolution && !composition && !background && !constraints && !mood && !palette && !cameraAngle && !lighting && !gesture && !propsPrompt && !detailLevel) {
      return NextResponse.json({ englishPrompt: "" });
    }

    const data = await translateViaWorker({ prompt, style, ratio, resolution, composition, background, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel });
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Translate error:", error);
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    if (message.includes("Codex worker")) {
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

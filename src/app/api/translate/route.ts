// src/app/api/translate/route.ts
// 설명(prompt)만 Gemini로 번역/강화, 스타일 프롬프트는 사용자 작성 그대로 사용
import { NextResponse } from "next/server";
import { BrandGenAI } from "@/lib/ai-provider";

export async function POST(req: Request) {
  try {
    const { prompt, style, ratio, resolution } = await req.json();

    // 아무것도 연결되지 않은 경우 빈 응답
    if (!prompt && !style && !ratio && !resolution) {
      return NextResponse.json({ englishPrompt: "" });
    }

    const parts: string[] = [];

    // 설명이 있는 경우: Gemini CLI로 번역/강화
    if (prompt) {
      const result = await BrandGenAI.buildPrompt({
        userInput: prompt,
        style: null,  // 스타일은 별도 처리
        ratio,
        resolution,
      });
      if (result.enhancedPrompt) parts.push(result.enhancedPrompt);
      if (result.technicalTags?.length) parts.push(result.technicalTags.join(", "));
    }

    // 스타일 프롬프트: 사용자가 작성한 그대로 추가 (Gemini 재해석 없음)
    if (style) {
      parts.push(style);
    }

    // 비율/해상도 태그 (설명 없이 스타일만 연결된 경우 추가)
    if (!prompt) {
      if (ratio) parts.push(`${ratio} aspect ratio`);
      if (resolution) parts.push(`${resolution} resolution`);
    }

    const englishPrompt = parts.join(". ").trim();

    return NextResponse.json({ englishPrompt });
  } catch (error: any) {
    console.error("Translate error:", error);

    if (error.message?.includes("Gemini CLI")) {
      return NextResponse.json(
        { error: "Gemini CLI가 설치되어 있지 않거나 실행할 수 없습니다. 터미널에서 'gemini --version'을 확인하세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

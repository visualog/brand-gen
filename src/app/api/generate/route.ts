// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BrandGenAI } from "@/lib/ai-provider";

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, customStyle, ratio = "1:1", resolution = "HD" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Step 1: Enhance the prompt using local Ollama (Exaone)
    const enhancedPrompt = await BrandGenAI.enhancePrompt(prompt);

    let styleModifier = "";
    switch (style) {
      case "minimal-line":
        styleModifier = "extremely minimalist, focus on emotional gestures, very thin irregular lines, clean negative space";
        break;
      case "soft-texture":
        styleModifier = "rich watercolor and crayon texture, soft muted tones, atmospheric depth and warmth";
        break;
      case "symbolic-graphic":
        styleModifier = "symbolic metaphors, geometric alignment combined with organic hand-drawn lines, domain-specific icons";
        break;
      case "custom":
        styleModifier = "following the specific composition and artistic style of the reference image";
        break;
    }

    const refinedPrompt = `${styleModifier ? styleModifier + ", " : ""}${enhancedPrompt}`;
    
    let width = 1024;
    let height = 1024;
    const baseSize = resolution === "HD" ? 1024 : 768;

    if (ratio === "16:9") {
      width = baseSize;
      height = Math.round(baseSize * (9 / 16));
    } else if (ratio === "9:16") {
      height = baseSize;
      width = Math.round(baseSize * (9 / 16));
    } else {
      width = baseSize;
      height = baseSize;
    }

    // Step 2: Generate the image URL
    const imageUrl = await BrandGenAI.generateImageUrl({ prompt: refinedPrompt, width, height });
    console.log("Generating image for URL:", imageUrl);

    // Proxy the image to avoid CORS/Loading issues
    console.log("Fetching image from Pollinations...");
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60000) // 60 second timeout for slow generation
    });

    if (!response.ok) {
      console.error("Pollinations response error:", response.status, response.statusText);
      throw new Error(`AI 서버가 응답하지 않습니다 (상태: ${response.status}). 잠시 후 다시 시도해 주세요.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    console.log("Image generation and proxying successful!");
    return NextResponse.json({ url: dataUrl });
  } catch (error: any) {
    console.error("Generation error details:", error);
    const errorMessage = error.name === 'TimeoutError' 
      ? "AI 모델 생성 시간이 너무 오래 걸립니다. 프롬프트를 조금 더 단순하게 입력해 보시거나 잠시 후 다시 시도해 주세요."
      : error.message;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

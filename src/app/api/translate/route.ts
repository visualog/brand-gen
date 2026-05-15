import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, style, ratio, resolution } = await req.json();

    const systemPrompt = `You are a professional prompt engineer for an AI image generator.
Your task is to take the user's inputs (Korean description, style, aspect ratio, and resolution) and output a highly optimized English prompt.
Only return the final English prompt as a single paragraph. Do not include any markdown, conversational text, or explanations.

Inputs:
- Description (Korean): ${prompt || 'None'}
- Style: ${style || 'None'}
- Aspect Ratio: ${ratio || 'None'}
- Resolution: ${resolution || 'None'}`;

    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'exaone3.5', // User requested exaone model
        prompt: systemPrompt,
        stream: false,
      })
    });
    
    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.statusText}`);
    }

    const data = await res.json();
    return NextResponse.json({ englishPrompt: data.response.trim() });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

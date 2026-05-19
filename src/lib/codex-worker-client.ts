const CODEX_WORKER_URL = process.env.BRANDGEN_CODEX_WORKER_URL || "http://127.0.0.1:4317";

async function postToWorker<T>(
  endpoint: string,
  payload: unknown,
  timeoutMs: number,
): Promise<T> {
  try {
    const response = await fetch(`${CODEX_WORKER_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || `Codex worker error (${response.status})`);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Codex worker 응답 시간 초과");
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("fetch failed") ||
        message.includes("econnrefused") ||
        message.includes("connect")
      ) {
        throw new Error(
          "Codex worker에 연결할 수 없습니다. 별도 터미널에서 `npm run codex-worker`를 실행하세요.",
        );
      }
      throw error;
    }

    throw new Error("Codex worker 요청 중 알 수 없는 오류가 발생했습니다.");
  }
}

export interface WorkerTranslateResponse {
  englishPrompt: string;
}

export interface WorkerAnalyzeStyleResponse {
  suggestedPrompt: string;
}

export interface WorkerGenerateResponse {
  url: string;
  threadId: string;
  filePath: string;
}

export function translateViaWorker(payload: {
  prompt?: string;
  style?: string;
  ratio?: string;
  resolution?: string;
  composition?: string | null;
  background?: string | null;
  constraints?: string | null;
  mood?: string | null;
  palette?: string | null;
  cameraAngle?: string | null;
  lighting?: string | null;
  gesture?: string | null;
  propsPrompt?: string | null;
  detailLevel?: string | null;
}) {
  return postToWorker<WorkerTranslateResponse>("/translate", payload, 90000);
}

export function analyzeStyleViaWorker(payload: {
  imageBase64: string;
  mimeType?: string;
}) {
  return postToWorker<WorkerAnalyzeStyleResponse>("/analyze-style", payload, 90000);
}

export function generateViaWorker(payload: {
  prompt?: string;
  style?: string | null;
  ratio?: string;
  resolution?: string;
  composition?: string | null;
  background?: string | null;
  constraints?: string | null;
  mood?: string | null;
  palette?: string | null;
  cameraAngle?: string | null;
  lighting?: string | null;
  gesture?: string | null;
  propsPrompt?: string | null;
  detailLevel?: string | null;
  prebuiltPrompt?: string | null;
}) {
  return postToWorker<WorkerGenerateResponse>("/generate", payload, 300000);
}

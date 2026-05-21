"use client";
// src/components/StyleAddModal.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Upload, Link, X, Sparkles, Loader2, ImageIcon, Check } from "lucide-react";

export interface StyleEntry {
  id: string;
  imageUrl: string;
  prompt: string;
  label: string;
}

interface Props {
  onAdd: (entry: StyleEntry) => void;
  onClose: () => void;
  mode?: "style" | "character" | "object";
}

const MODAL_COPY = {
  style: {
    title: "스타일 추가",
    promptLabel: "스타일 프롬프트",
    fallbackLabel: "사용자 스타일",
    alt: "Style reference",
    helper: "Codex가 스타일을 분석 중입니다",
    placeholder: "스타일을 직접 설명하거나 'Codex 자동 분석'으로 제안을 받으세요...",
  },
  character: {
    title: "캐릭터 참조 추가",
    promptLabel: "캐릭터 고정 프롬프트",
    fallbackLabel: "캐릭터 참조",
    alt: "Character reference",
    helper: "Codex가 캐릭터 특징을 분석 중입니다",
    placeholder: "캐릭터의 외형, 의상, 비율, 특징을 직접 입력하거나 자동 분석하세요...",
  },
  object: {
    title: "오브젝트 참조 추가",
    promptLabel: "오브젝트 고정 프롬프트",
    fallbackLabel: "오브젝트 참조",
    alt: "Object reference",
    helper: "Codex가 오브젝트 형태를 분석 중입니다",
    placeholder: "오브젝트의 형태, 구조, 색상, 소재를 직접 입력하거나 자동 분석하세요...",
  },
} as const;

function formatDurationLabel(totalSeconds: number | null) {
  if (totalSeconds === null) return null;
  if (totalSeconds < 60) return `${totalSeconds}초`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}분` : `${minutes}분 ${seconds}초`;
}

export function StyleAddModal({ onAdd, onClose, mode = "style" }: Props) {
  const copy = MODAL_COPY[mode];
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [prompt, setPrompt] = useState<string>("");
  const [urlInput, setUrlInput] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string>("");
  const [analyzeElapsedSeconds, setAnalyzeElapsedSeconds] = useState(0);
  const [lastAnalyzeDurationSeconds, setLastAnalyzeDurationSeconds] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analyzeStartedAtRef = useRef<number | null>(null);

  // 파일 → base64 변환
  const loadFile = (file: File) => {
    const mime = file.type || "image/jpeg";
    setMimeType(mime);
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setImageBase64(b64);
      setImageUrl(b64);
    };
    reader.readAsDataURL(file);
  };

  // 외부 URL → canvas → base64 변환
  const loadFromUrl = (url: string) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      const b64 = canvas.toDataURL("image/jpeg", 0.85);
      setImageBase64(b64);
      setImageUrl(url);
      setMimeType("image/jpeg");
    };
    img.onerror = () => {
      // CORS 실패 시 URL 그대로 사용
      setImageUrl(url);
      setImageBase64("");
    };
    img.src = url;
  };

  // 드래그 & 드롭
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      loadFile(file);
      return;
    }
    // URL 드롭 시도
    const text = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (text && (text.startsWith("http") || text.startsWith("https"))) {
      loadFromUrl(text);
    }
  }, []);

  // URL 입력 확인
  const handleUrlSubmit = () => {
    const url = urlInput.trim();
    if (!url) return;
    loadFromUrl(url);
    setUrlInput("");
  };

  // Codex 이미지 분석
  const handleAnalyze = async () => {
    if (!imageBase64 && !imageUrl) return;
    setIsAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageBase64 || imageUrl, mimeType, mode }),
      });
      const data = await res.json();
      if (data.suggestedPrompt) {
        setPrompt(data.suggestedPrompt);
      } else {
        setAnalyzeError(data.error || "분석 실패");
      }
    } catch (error: unknown) {
      setAnalyzeError(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!isAnalyzing) {
      if (analyzeStartedAtRef.current !== null) {
        const elapsed = Math.max(1, Math.round((Date.now() - analyzeStartedAtRef.current) / 1000));
        setLastAnalyzeDurationSeconds(elapsed);
        setAnalyzeElapsedSeconds(0);
        analyzeStartedAtRef.current = null;
      }
      return;
    }

    analyzeStartedAtRef.current = Date.now();
    setAnalyzeElapsedSeconds(0);
    const intervalId = window.setInterval(() => {
      if (analyzeStartedAtRef.current === null) return;
      setAnalyzeElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - analyzeStartedAtRef.current) / 1000)),
      );
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAnalyzing]);

  // 스타일 추가
  const handleAdd = () => {
    if (!imageUrl) return;
    onAdd({
      id: `style-${Date.now()}`,
      imageUrl,
      prompt: prompt.trim(),
      label: prompt.trim().slice(0, 30) || copy.fallbackLabel,
    });
    onClose();
  };

  const canAdd = !!imageUrl;
  const hasImage = !!imageUrl;

  return (
    <>
      {/* 오버레이 */}
      <div
        style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)", zIndex: 1000, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}
        onClick={onClose}
      />

      {/* 모달 */}
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001, width: "480px", maxWidth: "95vw",
          backgroundColor: "var(--bg-node-base)",
          border: "1px solid var(--border-node)",
          borderRadius: "16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-node)",
          backgroundColor: "var(--bg-node-header)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ImageIcon size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
              {copy.title}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", display: "flex" }}>
            <X size={16} color="var(--text-secondary)" />
          </button>
        </div>

        {/* 바디 */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* 이미지 첨부 영역 */}
          {!hasImage ? (
            <div>
              {/* 드롭존 */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? "var(--port-style)" : "var(--border-node)"}`,
                  borderRadius: "12px",
                  padding: "32px 20px",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", gap: "12px",
                  cursor: "pointer",
                  backgroundColor: isDragging ? "color-mix(in srgb, var(--port-style) 8%, transparent)" : "var(--bg-canvas)",
                  transition: "all 0.2s ease",
                  textAlign: "center",
                }}
              >
                <div style={{
                  width: "48px", height: "48px", borderRadius: "12px",
                  backgroundColor: "color-mix(in srgb, var(--port-style) 15%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Upload size={22} color="var(--port-style)" />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>
                    이미지를 드래그해서 놓기
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                    또는 클릭해서 파일 선택 · PNG, JPG, WEBP
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }}
              />

              {/* URL 입력 */}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", gap: "8px",
                  backgroundColor: "var(--bg-canvas)", border: "1px solid var(--border-node)",
                  borderRadius: "8px", padding: "0 12px",
                }}>
                  <Link size={14} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="이미지 URL 붙여넣기..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); }}
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      fontSize: "12px", color: "var(--text-primary)", padding: "10px 0",
                    }}
                  />
                </div>
                <button
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim()}
                  style={{
                    padding: "0 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                    border: "1px solid var(--border-node)", cursor: urlInput.trim() ? "pointer" : "not-allowed",
                    backgroundColor: urlInput.trim() ? "var(--text-primary)" : "var(--bg-canvas)",
                    color: urlInput.trim() ? "var(--bg-node-base)" : "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          ) : (
            /* 이미지 미리보기 */
            <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", height: "200px" }}>
              <img
                src={imageUrl}
                alt={copy.alt}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                onClick={() => { setImageUrl(""); setImageBase64(""); setPrompt(""); }}
                style={{
                  position: "absolute", top: "8px", right: "8px",
                  width: "28px", height: "28px", borderRadius: "50%",
                  backgroundColor: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={14} color="white" />
              </button>
            </div>
          )}

          {/* 스타일 프롬프트 입력 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                {copy.promptLabel}
              </label>
              <button
                onClick={handleAnalyze}
                disabled={!hasImage || isAnalyzing}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "4px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 700,
                  border: "1px solid var(--port-style)",
                  backgroundColor: hasImage && !isAnalyzing
                    ? "color-mix(in srgb, var(--port-style) 15%, transparent)"
                    : "transparent",
                  color: hasImage ? "var(--port-style)" : "var(--text-muted)",
                  cursor: hasImage && !isAnalyzing ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                }}
              >
                {isAnalyzing
                  ? <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> 분석 중... {formatDurationLabel(analyzeElapsedSeconds) ?? "0초"}</>
                  : <><Sparkles size={11} /> Codex 자동 분석</>
                }
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={hasImage
                ? copy.placeholder
                : "이미지를 먼저 첨부하세요."}
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box" as const,
                backgroundColor: "var(--bg-canvas)",
                border: "1px solid var(--border-node)",
                borderRadius: "8px", padding: "12px",
                fontSize: "12px", lineHeight: "1.6",
                color: "var(--text-primary)", resize: "vertical" as const, outline: "none",
                fontFamily: "inherit",
              }}
            />
            {(isAnalyzing || lastAnalyzeDurationSeconds) && (
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                {isAnalyzing
                  ? `${copy.helper} · ${formatDurationLabel(analyzeElapsedSeconds) ?? "0초"}`
                  : `마지막 분석 완료 · ${formatDurationLabel(lastAnalyzeDurationSeconds)}`}
              </p>
            )}
            {analyzeError && (
              <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{analyzeError}</p>
            )}
          </div>

          {/* 액션 버튼 */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px", borderRadius: "8px", fontSize: "13px",
                border: "1px solid var(--border-node)", backgroundColor: "var(--bg-canvas)",
                color: "var(--text-secondary)", cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "10px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 700,
                border: "none",
                backgroundColor: canAdd ? "var(--text-primary)" : "var(--bg-node-base)",
                color: canAdd ? "var(--bg-node-base)" : "var(--text-muted)",
                cursor: canAdd ? "pointer" : "not-allowed",
                transition: "all 0.15s",
              }}
            >
              <Check size={14} />
              스타일 추가
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

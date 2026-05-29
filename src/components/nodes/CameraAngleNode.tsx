"use client";

import { Handle, Position, useNodeConnections, useReactFlow } from "@xyflow/react";
import React, { useCallback, useMemo, useState, type PointerEvent } from "react";
import { Aperture, Camera, RotateCcw, Trash2, X } from "lucide-react";

type CameraDistance = "close" | "medium" | "wide" | "establishing";

type CameraModel = {
  yaw: number;
  pitch: number;
  roll: number;
  lens: number;
  distance: CameraDistance;
};

type CameraAngleNodeData = {
  cameraAngle: string;
  setCameraAngle: (value: string) => void;
  onRemove: () => void;
};

const DEFAULT_CAMERA: CameraModel = {
  yaw: 0,
  pitch: 0,
  roll: 0,
  lens: 50,
  distance: "medium",
};

const PRESETS: { label: string; model: CameraModel }[] = [
  { label: "정면", model: { yaw: 0, pitch: 0, roll: 0, lens: 50, distance: "medium" } },
  { label: "3/4 정면", model: { yaw: 35, pitch: 4, roll: 0, lens: 50, distance: "medium" } },
  { label: "측면", model: { yaw: 90, pitch: 0, roll: 0, lens: 70, distance: "medium" } },
  { label: "로우 앵글", model: { yaw: 18, pitch: -30, roll: 0, lens: 35, distance: "medium" } },
  { label: "탑뷰", model: { yaw: 0, pitch: 60, roll: 0, lens: 45, distance: "wide" } },
];

const AXIS_VIEWS: { label: string; model: Pick<CameraModel, "yaw" | "pitch"> }[] = [
  { label: "앞", model: { yaw: 0, pitch: 0 } },
  { label: "뒤", model: { yaw: 180, pitch: 0 } },
  { label: "좌", model: { yaw: -90, pitch: 0 } },
  { label: "우", model: { yaw: 90, pitch: 0 } },
  { label: "위", model: { yaw: 0, pitch: 60 } },
  { label: "아래", model: { yaw: 0, pitch: -60 } },
];

const LENS_PRESETS = [
  { label: "광각", value: 24, description: "공간 넓게" },
  { label: "표준", value: 50, description: "자연스럽게" },
  { label: "망원", value: 100, description: "배경 압축" },
];

const DISTANCE_LABEL: Record<CameraDistance, string> = {
  close: "클로즈",
  medium: "미디엄",
  wide: "와이드",
  establishing: "전경",
};

const DISTANCE_PROMPT: Record<CameraDistance, string> = {
  close: "close-up framing",
  medium: "medium shot framing",
  wide: "wide shot with more environment",
  establishing: "establishing view with broad spatial context",
};

const nodeStyle = {
  backgroundColor: "color-mix(in srgb, var(--bg-node-base) 5%, transparent)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "var(--ui-radius-xl)",
  border: "none",
  width: "340px",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  boxShadow: "var(--ui-shadow-node)",
};

const headerStyle = {
  backgroundColor: "var(--bg-node-header)",
  padding: "var(--ui-space-8) var(--ui-space-12)",
  display: "flex",
  alignItems: "center",
  gap: "var(--ui-space-8)",
};

const titleStyle = {
  fontSize: "var(--ui-type-xs-2-size)",
  fontWeight: 600 as const,
  color: "var(--text-secondary)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const bodyStyle = {
  padding: "var(--ui-space-12)",
  display: "flex",
  flexDirection: "column" as const,
  gap: "var(--ui-space-12)",
};

const chipStyle = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "var(--bg-canvas)",
  padding: "var(--ui-space-4) calc(var(--ui-space-unit) * 1.5) var(--ui-space-4) var(--ui-space-10)",
  borderRadius: "var(--ui-radius-pill)",
  border: "1px solid var(--border-node)",
  gap: "calc(var(--ui-space-unit) * 1.5)",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseCameraPrompt(value: string): CameraModel {
  const yaw = Number(value.match(/yaw\s+([+-]?\d+)/i)?.[1]);
  const pitch = Number(value.match(/pitch\s+([+-]?\d+)/i)?.[1]);
  const roll = Number(value.match(/roll\s+([+-]?\d+)/i)?.[1]);
  const lens = Number(value.match(/lens\s+(\d+)mm/i)?.[1]);
  const distanceMatch = value.match(/distance\s+(close|medium|wide|establishing)/i)?.[1] as CameraDistance | undefined;

  if (Number.isFinite(yaw) || Number.isFinite(pitch) || Number.isFinite(roll) || Number.isFinite(lens) || distanceMatch) {
    return {
      yaw: Number.isFinite(yaw) ? clamp(yaw, -180, 180) : DEFAULT_CAMERA.yaw,
      pitch: Number.isFinite(pitch) ? clamp(pitch, -75, 60) : DEFAULT_CAMERA.pitch,
      roll: Number.isFinite(roll) ? clamp(roll, -45, 45) : DEFAULT_CAMERA.roll,
      lens: Number.isFinite(lens) ? clamp(lens, 18, 135) : DEFAULT_CAMERA.lens,
      distance: distanceMatch || DEFAULT_CAMERA.distance,
    };
  }

  const lower = value.toLowerCase();
  if (lower.includes("top") || lower.includes("overhead")) return PRESETS[4].model;
  if (lower.includes("low")) return PRESETS[3].model;
  if (lower.includes("side")) return PRESETS[2].model;
  return DEFAULT_CAMERA;
}

function describeYaw(yaw: number) {
  const abs = Math.abs(yaw);
  const direction = yaw < 0 ? "left" : "right";
  if (abs < 12) return "front view";
  if (abs < 60) return `${abs} degree ${direction} three-quarter front view`;
  if (abs < 125) return `${abs} degree ${direction} side-biased view`;
  return `${abs} degree ${direction} rear-biased view`;
}

function describePitch(pitch: number) {
  if (pitch > 45) return "top-down high angle";
  if (pitch > 16) return "slightly high angle";
  if (pitch < -32) return "dramatic low angle";
  if (pitch < -10) return "slightly low angle";
  return "eye-level angle";
}

function describeRoll(roll: number) {
  const abs = Math.abs(roll);
  if (abs < 4) return "level horizon";
  return `${abs} degree ${roll < 0 ? "counterclockwise" : "clockwise"} dutch tilt`;
}

function describeLens(lens: number) {
  if (lens < 28) return "wide angle perspective";
  if (lens < 45) return "moderately wide perspective";
  if (lens < 70) return "natural perspective";
  if (lens < 100) return "portrait-length compressed perspective";
  return "telephoto compressed perspective";
}

function describeViewKorean(model: CameraModel) {
  const yaw = Math.abs(model.yaw);
  const side = model.yaw < 0 ? "좌측" : "우측";
  const horizontal = yaw < 12 ? "정면" : yaw < 55 ? `${side} 3/4` : yaw < 125 ? `${side} 측면` : `${side} 후면`;
  const vertical = model.pitch > 45 ? "탑뷰" : model.pitch > 16 ? "하이 앵글" : model.pitch < -32 ? "강한 로우 앵글" : model.pitch < -10 ? "로우 앵글" : "눈높이";
  return `${horizontal} · ${vertical}`;
}

function describeCameraPositionKorean(model: CameraModel) {
  const yaw = Math.abs(model.yaw);
  if (yaw < 12) return "오브젝트 앞";
  if (yaw > 150) return "오브젝트 뒤";
  if (model.yaw < 0) return yaw < 60 ? "좌측 앞" : yaw < 125 ? "좌측" : "좌측 뒤";
  return yaw < 60 ? "우측 앞" : yaw < 125 ? "우측" : "우측 뒤";
}

function describeCameraHeightKorean(pitch: number) {
  if (pitch > 45) return "위에서 내려봄";
  if (pitch > 16) return "살짝 위";
  if (pitch < -45) return "아래에서 올려봄";
  if (pitch < -16) return "살짝 아래";
  return "눈높이";
}

function describeLensKorean(lens: number) {
  if (lens < 35) return "광각";
  if (lens < 75) return "표준";
  return "망원";
}

function describeRollKorean(roll: number) {
  const abs = Math.abs(roll);
  if (abs < 4) return "수평";
  return `${roll < 0 ? "왼쪽" : "오른쪽"}으로 ${abs}° 기울어짐`;
}

function formatCameraPrompt(model: CameraModel) {
  const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);
  const guardrails = [
    model.lens <= 24 && model.distance === "close" ? "avoid unflattering wide-angle distortion" : "",
    Math.abs(model.roll) >= 15 ? "intentional dutch angle" : "",
  ].filter(Boolean);
  return [
    `Camera: ${describeYaw(model.yaw)}, ${describePitch(model.pitch)}, ${DISTANCE_PROMPT[model.distance]}, ${describeLens(model.lens)}.`,
    `Technical camera values: yaw ${signed(model.yaw)} degrees, pitch ${signed(model.pitch)} degrees, roll ${signed(model.roll)} degrees, distance ${model.distance}, lens ${model.lens}mm.`,
    `Compose as ${describeYaw(model.yaw)} from a ${describePitch(model.pitch)} with ${describeRoll(model.roll)}, ${DISTANCE_PROMPT[model.distance]}, and ${describeLens(model.lens)}.`,
    guardrails.length ? `Camera guardrails: ${guardrails.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
}

function modelsEqual(a: CameraModel, b: CameraModel) {
  return a.yaw === b.yaw && a.pitch === b.pitch && a.roll === b.roll && a.lens === b.lens && a.distance === b.distance;
}

function axesEqual(a: CameraModel, b: Pick<CameraModel, "yaw" | "pitch">) {
  return a.yaw === b.yaw && a.pitch === b.pitch;
}

export function CameraAngleNode({ id, data }: { id: string; data: CameraAngleNodeData }) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingPad, setIsDraggingPad] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const camera = useMemo(() => parseCameraPrompt(data.cameraAngle), [data.cameraAngle]);
  const connections = useNodeConnections({ handleType: "source", handleId: "camera-angle-out" });
  const isConnected = connections.length > 0;

  const updateCamera = useCallback(
    (patch: Partial<CameraModel>) => {
      const nextCamera = {
        ...camera,
        ...patch,
      };
      data.setCameraAngle(formatCameraPrompt(nextCamera));
    },
    [camera, data],
  );

  const handleDisconnect = () => {
    setEdges((eds) => eds.filter((e) => !(e.source === id && e.sourceHandle === "camera-angle-out")));
  };

  const updateOrbitFromPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const rawYaw = Math.round((x - 0.5) * 360);
      const rawPitch = Math.round((0.5 - y) * 135 - 7.5);
      const yaw = event.shiftKey ? Math.round(rawYaw / 15) * 15 : rawYaw;
      const pitch = event.shiftKey ? Math.round(rawPitch / 15) * 15 : rawPitch;
      updateCamera({ yaw, pitch });
    },
    [updateCamera],
  );

  const yawRad = (camera.yaw * Math.PI) / 180;
  const pitchRad = (camera.pitch * Math.PI) / 180;
  const orbitX = Math.sin(yawRad) * Math.cos(pitchRad);
  const orbitY = Math.sin(pitchRad);
  const orbitZ = Math.cos(yawRad) * Math.cos(pitchRad);
  const orbitCameraX = 50 + orbitX * 38;
  const orbitCameraY = 52 - orbitY * 34 + orbitZ * 18;
  const orbitCameraScale = 0.78 + ((orbitZ + 1) / 2) * 0.34;
  const orbitCameraOpacity = 0.62 + ((orbitZ + 1) / 2) * 0.38;
  const orbitCameraLayer = orbitZ >= 0 ? 7 : 3;
  const subjectLayer = orbitZ >= 0 ? 5 : 7;
  const pitchY = `${((60 - camera.pitch) / 135) * 100}%`;
  const activeLensPreset = LENS_PRESETS.reduce((closest, preset) => (
    Math.abs(preset.value - camera.lens) < Math.abs(closest.value - camera.lens) ? preset : closest
  ), LENS_PRESETS[0]);

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>
        <Aperture size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>카메라 앵글</span>
        <button type="button" onClick={data.onRemove} className="nodrag" title="카메라 앵글 노드 제거" style={{ marginLeft: "auto", width: "var(--size-control-sm)", height: "var(--size-control-sm)", borderRadius: "var(--ui-radius-pill)", border: "none", backgroundColor: "transparent", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Trash2 size={12} />
        </button>
      </div>

      <div style={bodyStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "calc(var(--ui-space-unit) * 1.5)" }} className="nodrag">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => data.setCameraAngle(formatCameraPrompt(preset.model))}
              style={{
                minHeight: 32,
                borderRadius: "var(--ui-radius-pill)",
                border: `1px solid ${modelsEqual(camera, preset.model) ? "var(--port-camera-angle)" : "var(--border-node)"}`,
                backgroundColor: modelsEqual(camera, preset.model)
                  ? "color-mix(in srgb, var(--port-camera-angle) 14%, transparent)"
                  : "var(--bg-canvas)",
                color: modelsEqual(camera, preset.model) ? "var(--port-camera-angle)" : "var(--text-secondary)",
                fontSize: "var(--ui-type-xs-size)",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "calc(var(--ui-space-unit) * 1.2)" }} className="nodrag" aria-label="카메라 축 스냅">
          {AXIS_VIEWS.map((axis) => {
            const isActive = axesEqual(camera, axis.model);
            return (
              <button
                key={axis.label}
                type="button"
                onClick={() => updateCamera(axis.model)}
                title={`${axis.label} 방향으로 카메라 배치`}
                style={{
                  minHeight: 28,
                  borderRadius: "var(--ui-radius-pill)",
                  border: `1px solid ${isActive ? "var(--port-camera-angle)" : "var(--border-node)"}`,
                  backgroundColor: isActive
                    ? "color-mix(in srgb, var(--port-camera-angle) 14%, transparent)"
                    : "var(--bg-canvas)",
                  color: isActive ? "var(--port-camera-angle)" : "var(--text-secondary)",
                  fontSize: "var(--ui-type-xs-size)",
                  fontWeight: 850,
                  cursor: "pointer",
                }}
              >
                {axis.label}
              </button>
            );
          })}
        </div>

        <div
          className="nodrag"
          role="slider"
          aria-label="전방향 카메라 오빗 뷰어"
          aria-valuemin={-180}
          aria-valuemax={180}
          aria-valuenow={camera.yaw}
          aria-valuetext={`yaw ${camera.yaw} degrees, pitch ${camera.pitch} degrees`}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setIsDraggingPad(true);
            updateOrbitFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (isDraggingPad) updateOrbitFromPointer(event);
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setIsDraggingPad(false);
          }}
          onPointerCancel={() => setIsDraggingPad(false)}
          onDoubleClick={() => updateCamera({ yaw: 0, pitch: 0 })}
          style={{
            position: "relative",
            height: 206,
            borderRadius: "var(--ui-radius-xl)",
            border: "1px solid var(--border-node)",
            overflow: "hidden",
            background:
              "radial-gradient(circle at 50% 52%, color-mix(in srgb, var(--port-camera-angle) 13%, transparent), transparent 39%), linear-gradient(180deg, color-mix(in srgb, var(--text-primary) 7%, transparent), transparent 58%), var(--bg-canvas)",
            cursor: "crosshair",
            touchAction: "none",
          }}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: "6% 12% 10%", width: "76%", height: "84%", pointerEvents: "none", zIndex: 1 }}>
            <ellipse cx="50" cy="52" rx="42" ry="25" fill="none" stroke="color-mix(in srgb, var(--port-camera-angle) 38%, var(--border-node))" strokeWidth="0.8" />
            <ellipse cx="50" cy="52" rx="42" ry="25" fill="none" stroke="color-mix(in srgb, var(--bg-node-base) 80%, transparent)" strokeWidth="0.4" strokeDasharray="2 3" />
            <ellipse cx="50" cy="52" rx="18" ry="42" fill="none" stroke="color-mix(in srgb, var(--border-node) 80%, transparent)" strokeWidth="0.55" />
            <ellipse cx="50" cy="52" rx="31" ry="42" fill="none" stroke="color-mix(in srgb, var(--border-node) 68%, transparent)" strokeWidth="0.45" />
            <line x1="8" y1="52" x2="92" y2="52" stroke="color-mix(in srgb, var(--border-node) 62%, transparent)" strokeWidth="0.45" />
            <line x1="50" y1="10" x2="50" y2="94" stroke="color-mix(in srgb, var(--border-node) 62%, transparent)" strokeWidth="0.45" />
            <line x1="50" y1="52" x2={orbitCameraX} y2={orbitCameraY} stroke="color-mix(in srgb, var(--port-camera-angle) 42%, transparent)" strokeWidth="0.75" strokeDasharray={orbitZ >= 0 ? "none" : "2 2"} />
          </svg>

          <OrbitSubject zIndex={subjectLayer} />
          <div style={{ position: "absolute", left: "50%", top: "52%", width: 74, height: 74, transform: "translate(-50%, -50%)", zIndex: subjectLayer - 1, borderRadius: "50%", border: "1px dashed color-mix(in srgb, var(--port-camera-angle) 34%, transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: "9%", top: "14%", bottom: "14%", width: 3, borderRadius: "var(--ui-radius-pill)", background: "color-mix(in srgb, var(--border-node) 70%, transparent)" }}>
            <div style={{ position: "absolute", left: -5, top: pitchY, width: 13, height: 13, transform: "translateY(-50%)", borderRadius: "50%", background: "var(--port-camera-angle)", border: "2px solid var(--bg-node-base)" }} />
          </div>
          <span style={{ position: "absolute", left: 19, top: 13, color: "var(--text-muted)", fontSize: "10px", fontWeight: 850 }}>상단</span>
          <span style={{ position: "absolute", left: 21, bottom: 13, color: "var(--text-muted)", fontSize: "10px", fontWeight: 850 }}>하단</span>
          <span style={{ position: "absolute", left: "50%", bottom: 9, transform: "translateX(-50%)", color: "var(--text-muted)", fontSize: "10px", fontWeight: 850 }}>앞</span>
          <span style={{ position: "absolute", left: "50%", top: 9, transform: "translateX(-50%)", color: "var(--text-muted)", fontSize: "10px", fontWeight: 850 }}>뒤</span>
          <span style={{ position: "absolute", left: "17%", top: "52%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "10px", fontWeight: 850 }}>좌</span>
          <span style={{ position: "absolute", right: "16%", top: "52%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "10px", fontWeight: 850 }}>우</span>
          <span style={{ position: "absolute", right: 10, top: 10, color: orbitZ >= 0 ? "var(--port-camera-angle)" : "var(--text-muted)", fontSize: "10px", fontWeight: 850 }}>
            {orbitZ >= 0 ? "카메라 앞쪽" : "카메라 뒤쪽"}
          </span>
          <div
            style={{
              position: "absolute",
              left: `${orbitCameraX}%`,
              top: `${orbitCameraY}%`,
              width: 28,
              height: 28,
              transform: `translate(-50%, -50%) scale(${orbitCameraScale})`,
              zIndex: orbitCameraLayer,
              opacity: orbitCameraOpacity,
              borderRadius: "50%",
              backgroundColor: "var(--port-camera-angle)",
              border: "2px solid var(--bg-node-base)",
              boxShadow: "0 0 0 1px var(--port-camera-angle), 0 8px 16px color-mix(in srgb, var(--port-camera-angle) 26%, transparent)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--bg-node-base)",
            }}
          >
            <Camera size={14} strokeWidth={2.8} />
          </div>
        </div>

        <div style={{ display: "grid", gap: "var(--ui-space-6)", border: "1px solid var(--border-node)", borderRadius: "var(--ui-space-10)", backgroundColor: "var(--bg-canvas)", padding: "var(--ui-space-10)" }}>
          <SummaryRow label="위치" value={describeCameraPositionKorean(camera)} />
          <SummaryRow label="높이" value={describeCameraHeightKorean(camera.pitch)} />
          <SummaryRow label="시점" value={describeViewKorean(camera)} />
          <SummaryRow label="프레이밍" value={DISTANCE_LABEL[camera.distance]} />
          <SummaryRow label="렌즈감" value={describeLensKorean(camera.lens)} />
          <SummaryRow label="수평선" value={describeRollKorean(camera.roll)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "calc(var(--ui-space-unit) * 1.5)" }} className="nodrag">
          {(Object.keys(DISTANCE_LABEL) as CameraDistance[]).map((distance) => (
            <button
              key={distance}
              type="button"
              onClick={() => updateCamera({ distance })}
              style={{
                minHeight: 30,
                borderRadius: "var(--ui-radius-pill)",
                border: `1px solid ${camera.distance === distance ? "var(--port-camera-angle)" : "var(--border-node)"}`,
                backgroundColor: camera.distance === distance
                  ? "color-mix(in srgb, var(--port-camera-angle) 14%, transparent)"
                  : "var(--bg-canvas)",
                color: camera.distance === distance ? "var(--port-camera-angle)" : "var(--text-secondary)",
                fontSize: "var(--ui-type-xs-size)",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {DISTANCE_LABEL[distance]}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "calc(var(--ui-space-unit) * 1.5)" }} className="nodrag">
          {LENS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => updateCamera({ lens: preset.value })}
              title={preset.description}
              style={{
                minHeight: 42,
                borderRadius: "var(--ui-radius-lg)",
                border: `1px solid ${activeLensPreset.label === preset.label ? "var(--port-camera-angle)" : "var(--border-node)"}`,
                backgroundColor: activeLensPreset.label === preset.label
                  ? "color-mix(in srgb, var(--port-camera-angle) 14%, transparent)"
                  : "var(--bg-canvas)",
                color: activeLensPreset.label === preset.label ? "var(--port-camera-angle)" : "var(--text-secondary)",
                fontSize: "var(--ui-type-xs-size)",
                fontWeight: 850,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <span>{preset.label}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 750 }}>{preset.description}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="nodrag"
          onClick={() => setShowAdvanced((value) => !value)}
          style={{
            alignSelf: "flex-start",
            height: 30,
            padding: "0 var(--ui-space-10)",
            borderRadius: "var(--ui-radius-pill)",
            border: "1px solid var(--border-node)",
            backgroundColor: "var(--bg-canvas)",
            color: "var(--text-secondary)",
            fontSize: "var(--ui-type-xs-size)",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          {showAdvanced ? "고급 닫기" : "고급 조정"}
        </button>

        {showAdvanced ? (
          <div style={{ display: "grid", gap: "var(--ui-space-10)", border: "1px solid var(--border-node)", borderRadius: "var(--ui-space-10)", backgroundColor: "var(--bg-canvas)", padding: "var(--ui-space-10)" }}>
            <ControlSlider label="수평선" min={-45} max={45} value={camera.roll} suffix="°" onChange={(value) => updateCamera({ roll: value })} />
            <ControlSlider label="렌즈" min={18} max={135} value={camera.lens} suffix="mm" onChange={(value) => updateCamera({ lens: value })} />
            <div style={{ color: "var(--text-muted)", fontSize: "var(--ui-type-xs-size)", fontWeight: 800 }}>
              Yaw {camera.yaw}° · Pitch {camera.pitch}° · Roll {camera.roll}° · Lens {camera.lens}mm
            </div>
          </div>
        ) : null}

        <div style={{ border: "1px solid var(--border-node)", borderRadius: "var(--ui-space-10)", backgroundColor: "var(--bg-canvas)", padding: "var(--ui-space-10)", color: "var(--text-secondary)", fontSize: "var(--ui-type-xs-size)", lineHeight: 1.55 }}>
          {formatCameraPrompt(camera)}
        </div>

        <button
          type="button"
          className="nodrag"
          onClick={() => data.setCameraAngle(formatCameraPrompt(DEFAULT_CAMERA))}
          style={{
            alignSelf: "flex-start",
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--ui-space-6)",
            height: 30,
            padding: "0 var(--ui-space-10)",
            borderRadius: "var(--ui-radius-pill)",
            border: "1px solid var(--border-node)",
            backgroundColor: "var(--bg-canvas)",
            color: "var(--text-secondary)",
            fontSize: "var(--ui-type-xs-size)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={12} />
          리셋
        </button>

        <NodeOutputChip
          colorVar="var(--port-camera-angle)"
          label="앵글 출력"
          isConnected={isConnected}
          isHovered={isHovered}
          onHover={setIsHovered}
          onClick={isConnected ? handleDisconnect : undefined}
          handleId="camera-angle-out"
        />
      </div>
    </div>
  );
}

function ControlSlider({
  label,
  min,
  max,
  value,
  suffix,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="nodrag" style={{ display: "grid", gridTemplateColumns: "54px 1fr 54px", alignItems: "center", gap: "var(--ui-space-8)", color: "var(--text-secondary)", fontSize: "var(--ui-type-xs-size)", fontWeight: 800 }}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: "100%", accentColor: "var(--port-camera-angle)" }}
      />
      <span style={{ textAlign: "right" }}>{value}{suffix}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: "var(--ui-space-8)", alignItems: "center" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "var(--ui-type-xs-size)", fontWeight: 850 }}>{label}</span>
      <span style={{ color: "var(--text-secondary)", fontSize: "var(--ui-type-xs-size)", fontWeight: 900, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function OrbitSubject({ zIndex }: { zIndex: number }) {
  return (
    <svg
      viewBox="0 0 84 84"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "50%",
        top: "52%",
        width: 70,
        height: 70,
        transform: "translate(-50%, -50%)",
        zIndex,
        overflow: "visible",
        pointerEvents: "none",
        filter: "drop-shadow(0 12px 18px color-mix(in srgb, var(--text-primary) 11%, transparent))",
      }}
    >
      <path
        d="M42 8 69 23 42 38 15 23Z"
        fill="color-mix(in srgb, var(--port-camera-angle) 32%, var(--bg-node-base))"
        stroke="color-mix(in srgb, var(--port-camera-angle) 52%, var(--border-node))"
        strokeWidth="1.4"
      />
      <path
        d="M15 23 42 38 42 72 15 56Z"
        fill="color-mix(in srgb, var(--port-camera-angle) 16%, var(--bg-node-base))"
        stroke="color-mix(in srgb, var(--port-camera-angle) 42%, var(--border-node))"
        strokeWidth="1.4"
      />
      <path
        d="M69 23 42 38 42 72 69 56Z"
        fill="color-mix(in srgb, var(--port-camera-angle) 24%, var(--bg-node-base))"
        stroke="color-mix(in srgb, var(--port-camera-angle) 46%, var(--border-node))"
        strokeWidth="1.4"
      />
      <path
        d="M42 8V38M15 23 42 38 69 23"
        fill="none"
        stroke="color-mix(in srgb, var(--bg-node-base) 70%, transparent)"
        strokeWidth="1"
      />
      <circle cx="42" cy="38" r="5.5" fill="var(--port-camera-angle)" stroke="var(--bg-node-base)" strokeWidth="2.5" />
      <text x="42" y="83" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="850">
        OBJECT
      </text>
    </svg>
  );
}

function NodeOutputChip({
  colorVar,
  label,
  isConnected,
  isHovered,
  onHover,
  onClick,
  handleId,
}: {
  colorVar: string;
  label: string;
  isConnected: boolean;
  isHovered: boolean;
  onHover: (value: boolean) => void;
  onClick?: () => void;
  handleId: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          ...chipStyle,
          backgroundColor: isConnected
            ? (isHovered ? `color-mix(in srgb, ${colorVar} 25%, transparent)` : `color-mix(in srgb, ${colorVar} 15%, transparent)`)
            : (isHovered ? `color-mix(in srgb, ${colorVar} 10%, var(--bg-canvas))` : "var(--bg-canvas)"),
          borderColor: isConnected ? colorVar : (isHovered ? colorVar : "var(--border-node)"),
          cursor: isConnected ? "pointer" : "crosshair",
          transition: "all 0.2s ease",
          position: "relative" as const,
        }}
        className="nodrag"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={onClick}
      >
        <span style={{ fontSize: "var(--ui-type-xs-size)", fontWeight: 700, color: isConnected ? colorVar : "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.3px", pointerEvents: "none", zIndex: 1, position: "relative" as const }}>
          {isConnected && isHovered ? "연결 해제" : label}
        </span>
        <div style={{ width: "var(--size-port-dot)", height: "var(--size-port-dot)", position: "relative" as const, zIndex: 1 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: isConnected && isHovered ? "var(--bg-node-base)" : colorVar, border: isConnected && isHovered ? `1px solid ${colorVar}` : "2px solid var(--bg-node-base)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
            {isConnected && isHovered && <X size={8} color={colorVar} strokeWidth={4} />}
          </div>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id={handleId}
          isConnectable={true}
          style={{
            ...(isConnected
              ? { width: "var(--size-port-dot)", height: "var(--size-port-dot)", right: "calc(var(--size-port-dot) / 2)", top: "calc(50% - var(--size-port-dot) / 2)", transform: "none", pointerEvents: "none", background: "transparent", border: "none" }
              : { position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent", border: "none", opacity: 0, zIndex: 10, cursor: "crosshair", pointerEvents: "auto", transform: "none", right: "auto", top: "auto" }),
          }}
        />
      </div>
    </div>
  );
}

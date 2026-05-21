"use client";

import { Handle, Position, useNodeConnections, useReactFlow } from "@xyflow/react";
import React from "react";
import { Box, Trash2, X } from "lucide-react";

const PORT_COLOR = "var(--port-object-angle)";
const SPHERE_SIZE = 136;
const SPHERE_RADIUS = SPHERE_SIZE / 2;
const DRAG_YAW_SENSITIVITY = 2.4;
const DRAG_PITCH_SENSITIVITY = 1.1;

const nodeStyle = {
  backgroundColor: "color-mix(in srgb, var(--bg-node-base) 5%, transparent)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "12px",
  border: "none",
  width: "260px",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  boxShadow: "var(--shadow-node)",
};

const headerStyle = {
  backgroundColor: "var(--bg-node-header)",
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const titleStyle = {
  fontSize: "12px",
  fontWeight: 600 as const,
  color: "var(--text-secondary)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const bodyStyle = {
  padding: "12px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
};

const chipStyle = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "var(--bg-canvas)",
  padding: "4px 6px 4px 10px",
  borderRadius: "100px",
  border: "1px solid var(--border-node)",
  gap: "6px",
};

type ObjectAngleNodeData = {
  objectAngle: string;
  setObjectAngle: (value: string) => void;
  onRemove: () => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startYaw: number;
  startPitch: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeYaw(value: number) {
  let nextValue = value;
  while (nextValue > 180) nextValue -= 360;
  while (nextValue < -180) nextValue += 360;
  return nextValue;
}

function getFacingDescriptor(yaw: number) {
  if (Math.abs(yaw) >= 150) return "back view, rear side of the object visible";
  if (yaw >= 105) return "right-back three-quarter view";
  if (yaw <= -105) return "left-back three-quarter view";
  if (yaw >= 45) return "right-side three-quarter view";
  if (yaw <= -45) return "left-side three-quarter view";
  return "front view, front side of the object visible";
}

function formatObjectAngle(yaw: number, pitch: number) {
  if (yaw === 0 && pitch === 0) {
    return "object facing forward with neutral object rotation";
  }

  const facing = getFacingDescriptor(yaw);

  return `mandatory object orientation: ${facing}, yaw ${yaw} deg, pitch ${pitch} deg; rotate the object itself, not the camera; do not default to a front-facing object`;
}

function parseObjectAngle(value: string) {
  const match = value.match(/yaw\s(-?\d+)\sdeg.*pitch\s(-?\d+)\sdeg/i);
  if (!match) return { yaw: 0, pitch: 0 };
  return {
    yaw: normalizeYaw(Number(match[1])),
    pitch: clamp(Number(match[2]), -60, 60),
  };
}

export function ObjectAngleNode({ id, data }: { id: string; data: ObjectAngleNodeData }) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragRef = React.useRef<DragState | null>(null);
  const connections = useNodeConnections({ handleType: "source", handleId: "object-angle-out" });
  const isConnected = connections.length > 0;
  const { yaw, pitch } = parseObjectAngle(data.objectAngle);
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const markerRadius = SPHERE_RADIUS - 18;
  const markerX = SPHERE_RADIUS + Math.sin(yawRad) * markerRadius;
  const markerY = SPHERE_RADIUS - Math.sin(pitchRad) * Math.cos(yawRad) * markerRadius;
  const markerDepth = Math.cos(yawRad) * Math.cos(pitchRad);
  const markerScale = markerDepth >= 0 ? 1 : 0.72;
  const markerOpacity = markerDepth >= 0 ? 1 : 0.44;
  const facingLabel = Math.abs(yaw) >= 150 ? "후면" : Math.abs(yaw) >= 90 ? "측후면" : "전면";

  const updateAngleFromDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const nextYaw = Math.round(normalizeYaw(drag.startYaw + deltaX * DRAG_YAW_SENSITIVITY));
    const nextPitch = Math.round(clamp(drag.startPitch - deltaY * DRAG_PITCH_SENSITIVITY, -60, 60));

    data.setObjectAngle(formatObjectAngle(nextYaw, nextPitch));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startYaw: yaw,
      startPitch: pitch,
    };
    setIsDragging(true);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const handleDisconnect = () => {
    setEdges((eds) => eds.filter((e) => !(e.source === id && e.sourceHandle === "object-angle-out")));
  };

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>
        <Box size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>오브젝트 앵글</span>
        <button
          type="button"
          onClick={data.onRemove}
          className="nodrag"
          title="오브젝트 앵글 노드 제거"
          style={{ marginLeft: "auto", width: "22px", height: "22px", borderRadius: "999px", border: "none", backgroundColor: "transparent", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div style={bodyStyle}>
        <div
          className="nodrag nowheel"
          onPointerDown={handlePointerDown}
          onPointerMove={updateAngleFromDrag}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: SPHERE_SIZE,
            height: SPHERE_SIZE,
            alignSelf: "center",
            borderRadius: "50%",
            position: "relative",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            background:
              "radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--bg-node-base) 95%, white), color-mix(in srgb, var(--bg-canvas) 75%, transparent) 52%, color-mix(in srgb, var(--bg-canvas) 94%, black) 100%)",
            border: "1px solid color-mix(in srgb, var(--border-node) 80%, transparent)",
            boxShadow: "inset -18px -22px 34px rgba(0,0,0,0.22), inset 14px 14px 28px rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 12,
              borderRadius: "50%",
              transform: `rotateX(${pitch}deg) rotateY(${yaw}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {[-60, -30, 0, 30, 60].map((angle) => (
              <div
                key={`lat-${angle}`}
                style={{
                  position: "absolute",
                  left: 2,
                  right: 2,
                  top: "50%",
                  height: `${Math.max(8, Math.cos((angle * Math.PI) / 180) * 78)}px`,
                  borderRadius: "50%",
                  border: "1px solid color-mix(in srgb, var(--text-muted) 22%, transparent)",
                  transform: `translateY(-50%) translateZ(${Math.sin((angle * Math.PI) / 180) * 42}px)`,
                }}
              />
            ))}
            {[0, 45, 90, 135].map((angle) => (
              <div
                key={`lon-${angle}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "1px solid color-mix(in srgb, var(--text-muted) 24%, transparent)",
                  transform: `rotateY(${angle}deg)`,
                }}
              />
            ))}
          </div>
          <div style={{ position: "absolute", inset: 1, borderRadius: "50%", boxShadow: "inset 0 0 0 999px color-mix(in srgb, transparent 84%, var(--bg-canvas))", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: 10, top: "50%", fontSize: 9, fontWeight: 800, color: "var(--text-muted)", transform: "translateY(-50%)" }}>L</div>
          <div style={{ position: "absolute", right: 10, top: "50%", fontSize: 9, fontWeight: 800, color: "var(--text-muted)", transform: "translateY(-50%)" }}>R</div>
          <div
            style={{
              position: "absolute",
              left: markerX,
              top: markerY,
              width: 18,
              height: 18,
              borderRadius: "50%",
              transform: `translate(-50%, -50%) scale(${markerScale})`,
              background: PORT_COLOR,
              border: "2px solid var(--bg-node-base)",
              boxShadow: "0 8px 18px rgba(0,0,0,0.28)",
              opacity: markerOpacity,
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: -4 }}>
          좌우 드래그 360도 회전 · 상하 드래그 기울기
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, fontSize: 11, color: "var(--text-muted)", alignItems: "center" }}>
          <span>Yaw {yaw} deg</span>
          <span style={{ color: PORT_COLOR, fontWeight: 800 }}>{facingLabel}</span>
          <span style={{ textAlign: "right" }}>Pitch {pitch} deg</span>
        </div>
        <div className="nodrag" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          {[
            { label: "정면", yaw: 0 },
            { label: "좌측", yaw: -90 },
            { label: "우측", yaw: 90 },
            { label: "후면", yaw: 180 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => data.setObjectAngle(formatObjectAngle(preset.yaw, 0))}
              style={{
                border: `1px solid ${yaw === preset.yaw && pitch === 0 ? PORT_COLOR : "var(--border-node)"}`,
                background: yaw === preset.yaw && pitch === 0 ? `color-mix(in srgb, ${PORT_COLOR} 14%, transparent)` : "var(--bg-canvas)",
                color: yaw === preset.yaw && pitch === 0 ? PORT_COLOR : "var(--text-secondary)",
                borderRadius: 10,
                padding: "8px 0",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <NodeOutputChip
          label="오브젝트 앵글 출력"
          isConnected={isConnected}
          isHovered={isHovered}
          onHover={setIsHovered}
          onClick={isConnected ? handleDisconnect : undefined}
          handleId="object-angle-out"
        />
      </div>
    </div>
  );
}

function NodeOutputChip({
  label,
  isConnected,
  isHovered,
  onHover,
  onClick,
  handleId,
}: {
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
            ? isHovered ? `color-mix(in srgb, ${PORT_COLOR} 25%, transparent)` : `color-mix(in srgb, ${PORT_COLOR} 15%, transparent)`
            : isHovered ? `color-mix(in srgb, ${PORT_COLOR} 10%, var(--bg-canvas))` : "var(--bg-canvas)",
          borderColor: isConnected ? PORT_COLOR : isHovered ? PORT_COLOR : "var(--border-node)",
          cursor: isConnected ? "pointer" : "crosshair",
          transition: "all 0.2s ease",
          position: "relative" as const,
        }}
        className="nodrag"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={onClick}
      >
        <span style={{ fontSize: "10px", fontWeight: 700, color: isConnected ? PORT_COLOR : "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.3px", pointerEvents: "none", zIndex: 1, position: "relative" as const }}>
          {isConnected && isHovered ? "연결 해제" : label}
        </span>
        <div style={{ width: "12px", height: "12px", position: "relative" as const, zIndex: 1 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: isConnected && isHovered ? "var(--bg-node-base)" : PORT_COLOR, border: isConnected && isHovered ? `1px solid ${PORT_COLOR}` : "2px solid var(--bg-node-base)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
            {isConnected && isHovered && <X size={8} color={PORT_COLOR} strokeWidth={4} />}
          </div>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          id={handleId}
          isConnectable={true}
          style={{
            ...(isConnected
              ? { width: "12px", height: "12px", right: "6px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", background: "transparent", border: "none" }
              : { position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent", border: "none", opacity: 0, zIndex: 10, cursor: "crosshair", pointerEvents: "auto", transform: "none", right: "auto", top: "auto" }),
          }}
        />
      </div>
    </div>
  );
}

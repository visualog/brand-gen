"use client";

import { Handle, Position, useNodeConnections, useReactFlow } from "@xyflow/react";
import React from "react";
import { ShieldBan, X, Trash2 } from "lucide-react";

const nodeStyle = {
  backgroundColor: "color-mix(in srgb, var(--bg-node-base) 5%, transparent)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "12px",
  border: "none",
  width: "220px",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
  boxShadow: "var(--shadow-node)",
};

const headerStyle = {
  backgroundColor: "var(--bg-node-header)",
  padding: "8px 12px",
  borderBottom: "none",
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

const optionGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px",
};

const optionButtonStyle = (isActive: boolean) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 8px",
  borderRadius: "10px",
  border: `1px solid ${isActive ? "var(--port-constraint)" : "var(--border-node)"}`,
  backgroundColor: isActive
    ? "color-mix(in srgb, var(--port-constraint) 14%, transparent)"
    : "var(--bg-canvas)",
  color: isActive ? "var(--port-constraint)" : "var(--text-secondary)",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
});

const chipStyle = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "var(--bg-canvas)",
  padding: "4px 6px 4px 10px",
  borderRadius: "100px",
  border: "1px solid var(--border-node)",
  gap: "6px",
};

type ConstraintNodeData = {
  constraints: string;
  setConstraints: (value: string) => void;
  onRemove: () => void;
};

const constraintOptions = [
  { label: "텍스트X", value: "no text, letters, numbers, captions, or typography anywhere" },
  { label: "로고X", value: "no logo, watermark, badge, or brand mark visible in the image" },
  { label: "1인물", value: "single human subject only, with no additional people or crowd elements" },
  { label: "소품절제", value: "limit props and background objects to only the minimum needed for the concept" },
];

export function ConstraintNode({ id, data }: { id: string; data: ConstraintNodeData }) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = React.useState(false);
  const connections = useNodeConnections({ handleType: "source", handleId: "constraint-out" });
  const isConnected = connections.length > 0;

  const handleDisconnect = () => {
    setEdges((eds) => eds.filter((e) => !(e.source === id && e.sourceHandle === "constraint-out")));
  };

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>
        <ShieldBan size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>제한사항</span>
        <button type="button" onClick={data.onRemove} className="nodrag" title="제한사항 노드 제거" style={{ marginLeft: "auto", width: "22px", height: "22px", borderRadius: "999px", border: "none", backgroundColor: "transparent", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Trash2 size={12} />
        </button>
      </div>
      <div style={bodyStyle}>
        <div style={optionGridStyle} className="nodrag">
          {constraintOptions.map((option) => (
            <button key={option.label} type="button" style={optionButtonStyle(data.constraints === option.value)} onClick={() => data.setConstraints(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ ...chipStyle, backgroundColor: isConnected ? (isHovered ? "color-mix(in srgb, var(--port-constraint) 25%, transparent)" : "color-mix(in srgb, var(--port-constraint) 15%, transparent)") : (isHovered ? "color-mix(in srgb, var(--port-constraint) 10%, var(--bg-canvas))" : "var(--bg-canvas)"), borderColor: isConnected ? "var(--port-constraint)" : (isHovered ? "var(--port-constraint)" : "var(--border-node)"), cursor: isConnected ? "pointer" : "crosshair", transition: "all 0.2s ease", position: "relative" as const }} className="nodrag" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onClick={isConnected ? handleDisconnect : undefined}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: isConnected ? "var(--port-constraint)" : "var(--text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.3px", pointerEvents: "none", zIndex: 1, position: "relative" as const }}>
              {isConnected && isHovered ? "연결 해제" : "제한 출력"}
            </span>
            <div style={{ width: "12px", height: "12px", position: "relative" as const, zIndex: 1 }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: isConnected && isHovered ? "var(--bg-node-base)" : "var(--port-constraint)", border: isConnected && isHovered ? "1px solid var(--port-constraint)" : "2px solid var(--bg-node-base)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                {isConnected && isHovered && <X size={8} color="var(--port-constraint)" strokeWidth={4} />}
              </div>
            </div>
            <Handle type="source" position={Position.Right} id="constraint-out" isConnectable={true} style={{ ...(isConnected ? { width: "12px", height: "12px", right: "6px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", background: "transparent", border: "none" } : { position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent", border: "none", opacity: 0, zIndex: 10, cursor: "crosshair", pointerEvents: "auto", transform: "none", right: "auto", top: "auto" }) }} />
          </div>
        </div>
      </div>
    </div>
  );
}

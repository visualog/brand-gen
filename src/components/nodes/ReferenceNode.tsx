"use client";

import { Handle, Position, useNodeConnections, useReactFlow } from "@xyflow/react";
import React, { useState } from "react";
import { Cuboid, Plus, Trash2, UserRound, X } from "lucide-react";
import { StyleAddModal } from "@/components/StyleAddModal";
import type { StyleEntry } from "@/components/StyleAddModal";

type ReferenceKind = "character" | "object";

type ReferenceNodeData = {
  references: StyleEntry[];
  activeReferenceId: string | null;
  setReferences: React.Dispatch<React.SetStateAction<StyleEntry[]>>;
  setActiveReferenceId: (value: string | null) => void;
  onRemove: () => void;
  kind: ReferenceKind;
};

const COPY = {
  character: {
    title: "캐릭터 참조",
    empty: "일관성을 유지할 캐릭터 이미지를 등록하세요",
    output: "캐릭터 출력",
    selected: "선택됨",
    handleId: "character-reference-out",
    color: "var(--port-character-reference)",
    icon: UserRound,
  },
  object: {
    title: "오브젝트 참조",
    empty: "반복 등장할 제품이나 소품 이미지를 등록하세요",
    output: "오브젝트 출력",
    selected: "선택됨",
    handleId: "object-reference-out",
    color: "var(--port-object-reference)",
    icon: Cuboid,
  },
} as const;

const nodeStyle = {
  backgroundColor: "color-mix(in srgb, var(--bg-node-base) 5%, transparent)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "12px",
  border: "none",
  width: "280px",
  display: "flex",
  flexDirection: "column" as const,
  boxShadow: "var(--shadow-node)",
  overflow: "visible" as const,
};

const headerStyle = {
  backgroundColor: "var(--bg-node-header)",
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  borderTopLeftRadius: "12px",
  borderTopRightRadius: "12px",
};

const titleStyle = {
  fontSize: "12px",
  fontWeight: 600 as const,
  color: "var(--text-secondary)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

export function ReferenceNode({ id, data }: { id: string; data: ReferenceNodeData }) {
  const copy = COPY[data.kind];
  const Icon = copy.icon;
  const { setEdges } = useReactFlow();
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const connections = useNodeConnections({ handleType: "source", handleId: copy.handleId });
  const isConnected = connections.length > 0;
  const activeReference = data.references.find((entry) => entry.id === data.activeReferenceId);

  const handleAdd = (entry: StyleEntry) => {
    data.setReferences((prev) => [...prev, entry]);
    data.setActiveReferenceId(entry.id);
  };

  const handleDelete = (event: React.MouseEvent, referenceId: string) => {
    event.stopPropagation();
    data.setReferences((prev) => prev.filter((entry) => entry.id !== referenceId));
    if (data.activeReferenceId === referenceId) data.setActiveReferenceId(null);
  };

  const handleDisconnect = () => {
    setEdges((eds) => eds.filter((edge) => !(edge.source === id && edge.sourceHandle === copy.handleId)));
  };

  return (
    <>
      {showModal && (
        <StyleAddModal
          mode={data.kind}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
      <div style={nodeStyle}>
        <div style={headerStyle}>
          <Icon size={16} color="var(--text-secondary)" />
          <span style={titleStyle}>{copy.title}</span>
          {activeReference && (
            <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: copy.color, backgroundColor: `color-mix(in srgb, ${copy.color} 12%, transparent)`, padding: "2px 8px", borderRadius: 999 }}>
              {copy.selected}
            </span>
          )}
          <button type="button" onClick={data.onRemove} className="nodrag" title={`${copy.title} 노드 제거`} style={{ width: 22, height: 22, borderRadius: 999, border: "none", backgroundColor: "transparent", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Trash2 size={12} />
          </button>
        </div>
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {data.references.length > 0 ? (
            <div className="nodrag" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {data.references.map((entry) => {
                const isActive = entry.id === data.activeReferenceId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => data.setActiveReferenceId(isActive ? null : entry.id)}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 8, borderRadius: 8, border: `1.5px solid ${isActive ? copy.color : "var(--border-node)"}`, backgroundColor: isActive ? `color-mix(in srgb, ${copy.color} 8%, transparent)` : "var(--bg-canvas)", color: "inherit", cursor: "pointer", textAlign: "left", position: "relative" }}
                  >
                    <span style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, backgroundColor: "var(--bg-node-header)" }}>
                      <img src={entry.imageUrl} alt={entry.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 10, lineHeight: 1.5, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {entry.prompt || "참조 프롬프트 없음"}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => handleDelete(event, entry.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") handleDelete(event as unknown as React.MouseEvent, entry.id);
                      }}
                      style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.58 }}
                    >
                      <Trash2 size={11} color="var(--text-secondary)" />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "18px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5 }}>
              <Icon size={24} color="var(--border-node)" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0 }}>{copy.empty}</p>
            </div>
          )}
          <button type="button" className="nodrag" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: 8, borderRadius: 8, border: "1.5px dashed var(--border-node)", backgroundColor: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> 추가
          </button>
          <NodeOutputChip color={copy.color} label={copy.output} handleId={copy.handleId} isConnected={isConnected} isHovered={isHovered} onHover={setIsHovered} onClick={isConnected ? handleDisconnect : undefined} />
        </div>
      </div>
    </>
  );
}

function NodeOutputChip({ color, label, handleId, isConnected, isHovered, onHover, onClick }: { color: string; label: string; handleId: string; isConnected: boolean; isHovered: boolean; onHover: (value: boolean) => void; onClick?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
      <div className="nodrag" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} onClick={onClick} style={{ display: "flex", alignItems: "center", padding: "4px 6px 4px 10px", borderRadius: 999, border: `1px solid ${isConnected ? color : isHovered ? color : "var(--border-node)"}`, backgroundColor: isConnected ? `color-mix(in srgb, ${color} 15%, transparent)` : "var(--bg-canvas)", gap: 6, cursor: isConnected ? "pointer" : "crosshair", position: "relative" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: isConnected ? color : "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.3, pointerEvents: "none", zIndex: 1 }}>
          {isConnected && isHovered ? "연결 해제" : label}
        </span>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: isConnected && isHovered ? "var(--bg-node-base)" : color, border: isConnected && isHovered ? `1px solid ${color}` : "2px solid var(--bg-node-base)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          {isConnected && isHovered && <X size={8} color={color} strokeWidth={4} />}
        </span>
        <Handle type="source" position={Position.Right} id={handleId} isConnectable={true} style={{ ...(isConnected ? { width: 12, height: 12, right: 6, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", background: "transparent", border: "none" } : { position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent", border: "none", opacity: 0, zIndex: 10, cursor: "crosshair", pointerEvents: "auto", transform: "none", right: "auto", top: "auto" }) }} />
      </div>
    </div>
  );
}

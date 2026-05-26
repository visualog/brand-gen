"use client";

import { Handle, Position, useNodeConnections, useReactFlow } from "@xyflow/react";
import React, { useState } from "react";
import { Blend, Check, Plus, Trash2, X } from "lucide-react";
import { StyleAddModal, type StyleEntry } from "@/components/StyleAddModal";

export type ImageMixRole = "character" | "object" | "style" | "palette" | "composition" | "background";
export type ImageMixWeight = "low" | "medium" | "high";

export type ImageMixItem = StyleEntry & {
  role: ImageMixRole;
  weight: ImageMixWeight;
  enabled?: boolean;
};

type ImageMixNodeData = {
  items: ImageMixItem[];
  setItems: React.Dispatch<React.SetStateAction<ImageMixItem[]>>;
  onRemove: () => void;
};

const ROLE_OPTIONS: Array<{ value: ImageMixRole; label: string }> = [
  { value: "character", label: "캐릭터" },
  { value: "object", label: "오브젝트" },
  { value: "style", label: "스타일" },
  { value: "palette", label: "색감" },
  { value: "composition", label: "구도" },
  { value: "background", label: "배경" },
];

const WEIGHT_OPTIONS: Array<{ value: ImageMixWeight; label: string }> = [
  { value: "low", label: "약" },
  { value: "medium", label: "중" },
  { value: "high", label: "강" },
];

const color = "var(--port-image-mix)";
const handleId = "image-mix-out";

const nodeStyle = {
  backgroundColor: "color-mix(in srgb, var(--bg-node-base) 5%, transparent)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "var(--ui-radius-xl)",
  border: "none",
  width: "var(--size-node-reference)",
  display: "flex",
  flexDirection: "column" as const,
  boxShadow: "var(--ui-shadow-node)",
  overflow: "visible" as const,
};

const headerStyle = {
  backgroundColor: "var(--bg-node-header)",
  padding: "var(--ui-space-8) var(--ui-space-12)",
  display: "flex",
  alignItems: "center",
  gap: "var(--ui-space-8)",
  borderTopLeftRadius: "12px",
  borderTopRightRadius: "12px",
};

const titleStyle = {
  fontSize: "var(--ui-type-xs-2-size)",
  fontWeight: 600 as const,
  color: "var(--text-secondary)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

function roleLabel(role: ImageMixRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "참조";
}

export function ImageMixNode({ id, data }: { id: string; data: ImageMixNodeData }) {
  const { setEdges } = useReactFlow();
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const connections = useNodeConnections({ handleType: "source", handleId });
  const isConnected = connections.length > 0;
  const activeCount = data.items.filter((item) => item.enabled !== false).length;

  const handleAdd = (entry: StyleEntry) => {
    data.setItems((prev) => [
      ...prev,
      {
        ...entry,
        id: `image-mix-${Date.now()}`,
        role: "style",
        weight: "medium",
        enabled: true,
      },
    ]);
  };

  const updateItem = (itemId: string, patch: Partial<ImageMixItem>) => {
    data.setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  };

  const deleteItem = (event: React.MouseEvent, itemId: string) => {
    event.stopPropagation();
    data.setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleDisconnect = () => {
    setEdges((eds) => eds.filter((edge) => !(edge.source === id && edge.sourceHandle === handleId)));
  };

  return (
    <>
      {showModal && (
        <StyleAddModal
          mode="style"
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
      <div style={nodeStyle}>
        <div style={headerStyle}>
          <Blend size={16} color="var(--text-secondary)" />
          <span style={titleStyle}>이미지 믹스</span>
          {activeCount > 0 && (
            <span style={{ marginLeft: "auto", fontSize: "var(--ui-type-xs-size)", fontWeight: 700, color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, padding: "calc(var(--ui-space-unit) * 0.5) var(--ui-space-8)", borderRadius: "var(--ui-radius-pill)" }}>
              {activeCount}개 사용
            </span>
          )}
          <button type="button" onClick={data.onRemove} className="nodrag" title="이미지 믹스 노드 제거" style={{ width: "var(--size-control-sm)", height: "var(--size-control-sm)", borderRadius: "var(--ui-radius-pill)", border: "none", backgroundColor: "transparent", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Trash2 size={12} />
          </button>
        </div>

        <div style={{ padding: "var(--ui-space-12)", display: "flex", flexDirection: "column", gap: "var(--ui-space-8)" }}>
          {data.items.length > 0 ? (
            <div className="nodrag" style={{ display: "flex", flexDirection: "column", gap: "calc(var(--ui-space-unit) * 1.5)" }}>
              {data.items.map((item) => {
                const enabled = item.enabled !== false;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--ui-space-8)",
                      padding: "var(--ui-space-8)",
                      borderRadius: "var(--ui-space-8)",
                      border: `1.5px solid ${enabled ? color : "var(--border-node)"}`,
                      backgroundColor: enabled ? `color-mix(in srgb, ${color} 8%, transparent)` : "var(--bg-canvas)",
                    }}
                  >
                    <div style={{ display: "flex", gap: "var(--ui-space-10)", alignItems: "flex-start", position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { enabled: !enabled })}
                        title={enabled ? "믹스에서 제외" : "믹스에 포함"}
                        style={{ width: "var(--size-icon-container)", height: "var(--size-icon-container)", borderRadius: "var(--ui-radius-md)", overflow: "hidden", flexShrink: 0, border: "none", padding: 0, backgroundColor: "var(--bg-node-header)", position: "relative", cursor: "pointer" }}
                      >
                        <img src={item.imageUrl} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: enabled ? 1 : 0.38 }} />
                        {enabled && (
                          <span style={{ position: "absolute", right: 4, bottom: 4, width: 16, height: 16, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={10} color="var(--bg-node-base)" strokeWidth={4} />
                          </span>
                        )}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--ui-space-6)", marginBottom: 4 }}>
                          <span style={{ fontSize: "var(--ui-type-xs-size)", fontWeight: 800, color: enabled ? color : "var(--text-muted)" }}>
                            {roleLabel(item.role)}
                          </span>
                          <span style={{ fontSize: "var(--ui-type-xs-size)", color: "var(--text-muted)" }}>
                            영향 {WEIGHT_OPTIONS.find((option) => option.value === item.weight)?.label}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "var(--ui-type-xs-size)", lineHeight: 1.5, color: enabled ? "var(--text-secondary)" : "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {item.prompt || item.label || "이미지에서 사용할 특징을 설명하세요"}
                        </p>
                      </div>
                      <button type="button" onClick={(event) => deleteItem(event, item.id)} title="이미지 제거" style={{ width: "var(--size-control-xs)", height: "var(--size-control-xs)", borderRadius: "50%", border: "none", background: "transparent", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: 0.7 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--ui-space-6)" }}>
                      <select
                        value={item.role}
                        onChange={(event) => updateItem(item.id, { role: event.target.value as ImageMixRole })}
                        style={{ minWidth: 0, height: 28, border: "1px solid var(--border-node)", borderRadius: "var(--ui-space-8)", background: "var(--bg-canvas)", color: "var(--text-secondary)", fontSize: "var(--ui-type-xs-size)", padding: "0 var(--ui-space-8)" }}
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                        {WEIGHT_OPTIONS.map((option) => {
                          const active = item.weight === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateItem(item.id, { weight: option.value })}
                              style={{ height: 28, border: `1px solid ${active ? color : "var(--border-node)"}`, borderRadius: "var(--ui-space-8)", background: active ? `color-mix(in srgb, ${color} 12%, transparent)` : "var(--bg-canvas)", color: active ? color : "var(--text-muted)", fontSize: "var(--ui-type-xs-size)", fontWeight: 700, cursor: "pointer" }}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "calc(var(--ui-space-unit) * 4.5) var(--ui-space-12)", textAlign: "center", color: "var(--text-muted)", fontSize: "calc(var(--ui-type-xs-size) * 1.1)", lineHeight: 1.5 }}>
              <Blend size={24} color="var(--border-node)" style={{ marginBottom: 8 }} />
              <p style={{ margin: 0 }}>여러 이미지를 역할별로 섞어<br />생성 기준을 만드세요</p>
            </div>
          )}

          <button type="button" className="nodrag" onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "calc(var(--ui-space-unit) * 1.5)", width: "100%", padding: "var(--ui-space-8)", borderRadius: "var(--ui-space-8)", border: "1.5px dashed var(--border-node)", backgroundColor: "transparent", color: "var(--text-secondary)", fontSize: "var(--ui-type-xs-2-size)", fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> 이미지 추가
          </button>
          <NodeOutputChip isConnected={isConnected} isHovered={isHovered} onHover={setIsHovered} onClick={isConnected ? handleDisconnect : undefined} />
        </div>
      </div>
    </>
  );
}

function NodeOutputChip({ isConnected, isHovered, onHover, onClick }: { isConnected: boolean; isHovered: boolean; onHover: (value: boolean) => void; onClick?: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
      <div className="nodrag" onMouseEnter={() => onHover(true)} onMouseLeave={() => onHover(false)} onClick={onClick} style={{ display: "flex", alignItems: "center", padding: "var(--ui-space-4) calc(var(--ui-space-unit) * 1.5) var(--ui-space-4) var(--ui-space-10)", borderRadius: "var(--ui-radius-pill)", border: `1px solid ${isConnected ? color : isHovered ? color : "var(--border-node)"}`, backgroundColor: isConnected ? `color-mix(in srgb, ${color} 15%, transparent)` : "var(--bg-canvas)", gap: "calc(var(--ui-space-unit) * 1.5)", cursor: isConnected ? "pointer" : "crosshair", position: "relative" }}>
        <span style={{ fontSize: "var(--ui-type-xs-size)", fontWeight: 700, color: isConnected ? color : "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.3, pointerEvents: "none", zIndex: 1 }}>
          {isConnected && isHovered ? "연결 해제" : "믹스 출력"}
        </span>
        <span style={{ width: "var(--size-port-dot)", height: "var(--size-port-dot)", borderRadius: "50%", background: isConnected && isHovered ? "var(--bg-node-base)" : color, border: isConnected && isHovered ? `1px solid ${color}` : "2px solid var(--bg-node-base)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          {isConnected && isHovered && <X size={8} color={color} strokeWidth={4} />}
        </span>
        <Handle type="source" position={Position.Right} id={handleId} isConnectable={true} style={{ ...(isConnected ? { width: "var(--size-port-dot)", height: "var(--size-port-dot)", right: "calc(var(--size-port-dot) / 2)", top: "calc(50% - var(--size-port-dot) / 2)", transform: "none", pointerEvents: "none", background: "transparent", border: "none" } : { position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent", border: "none", opacity: 0, zIndex: 10, cursor: "crosshair", pointerEvents: "auto", transform: "none", right: "auto", top: "auto" }) }} />
      </div>
    </div>
  );
}

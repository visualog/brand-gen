"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ImagePlus,
  LayoutGrid,
  Plus,
  Sparkles,
} from "lucide-react";

import { PromptNode } from "@/components/nodes/PromptNode";
import { StyleNode } from "@/components/nodes/StyleNode";
import { ReferenceNode } from "@/components/nodes/ReferenceNode";
import { RatioNode } from "@/components/nodes/RatioNode";
import { ResolutionNode } from "@/components/nodes/ResolutionNode";
import { CompositionNode } from "@/components/nodes/CompositionNode";
import { BackgroundNode } from "@/components/nodes/BackgroundNode";
import { ConstraintNode } from "@/components/nodes/ConstraintNode";
import { MoodNode } from "@/components/nodes/MoodNode";
import { PaletteNode } from "@/components/nodes/PaletteNode";
import { CameraAngleNode } from "@/components/nodes/CameraAngleNode";
import { ObjectAngleNode } from "@/components/nodes/ObjectAngleNode";
import { LightingNode } from "@/components/nodes/LightingNode";
import { GestureNode } from "@/components/nodes/GestureNode";
import { PropsNode } from "@/components/nodes/PropsNode";
import { DetailNode } from "@/components/nodes/DetailNode";
import { OutputNode } from "@/components/nodes/OutputNode";
import { CanvasNode } from "@/components/nodes/CanvasNode";

import type { StyleEntry } from "@/components/StyleAddModal";

const STORAGE_KEY = "brandgen_state";

const OPTIONAL_NODE_CONFIG = {
  composition: {
    id: "composition-node",
    type: "compositionNode",
    label: "구도",
    description: "전신, 반신, 클로즈업, 원거리 같은 장면 구도를 제어합니다.",
    position: { x: 50, y: 850 },
    sourceHandle: "composition-out",
    edgeId: "e-composition-output",
    color: "var(--port-composition)",
  },
  characterReference: {
    id: "character-reference-node",
    type: "referenceNode",
    label: "캐릭터 참조",
    description: "같은 캐릭터 외형, 의상, 비율을 반복 생성에 고정합니다.",
    position: { x: 300, y: 850 },
    sourceHandle: "character-reference-out",
    edgeId: "e-character-reference-output",
    color: "var(--port-character-reference)",
  },
  objectReference: {
    id: "object-reference-node",
    type: "referenceNode",
    label: "오브젝트 참조",
    description: "제품, 자전거, 소품 같은 반복 오브젝트 형태를 고정합니다.",
    position: { x: 550, y: 850 },
    sourceHandle: "object-reference-out",
    edgeId: "e-object-reference-output",
    color: "var(--port-object-reference)",
  },
  background: {
    id: "background-node",
    type: "backgroundNode",
    label: "배경",
    description: "배경 밀도와 환경 분위기를 제어합니다.",
    position: { x: 800, y: 850 },
    sourceHandle: "background-out",
    edgeId: "e-background-output",
    color: "var(--port-background)",
  },
  constraints: {
    id: "constraint-node",
    type: "constraintNode",
    label: "제한사항",
    description: "텍스트, 로고, 인원 수 같은 금지 조건을 고정합니다.",
    position: { x: 1050, y: 850 },
    sourceHandle: "constraint-out",
    edgeId: "e-constraint-output",
    color: "var(--port-constraint)",
  },
  mood: {
    id: "mood-node",
    type: "moodNode",
    label: "무드",
    description: "장면의 감정 톤과 에너지 레벨을 제어합니다.",
    position: { x: 1300, y: 850 },
    sourceHandle: "mood-out",
    edgeId: "e-mood-output",
    color: "var(--port-mood)",
  },
  palette: {
    id: "palette-node",
    type: "paletteNode",
    label: "색상 팔레트",
    description: "색 사용 규칙과 톤 방향을 분리해서 제어합니다.",
    position: { x: 1550, y: 850 },
    sourceHandle: "palette-out",
    edgeId: "e-palette-output",
    color: "var(--port-palette)",
  },
  cameraAngle: {
    id: "camera-angle-node",
    type: "cameraAngleNode",
    label: "카메라 앵글",
    description: "정면, 측면, 로우, 탑뷰 같은 시점 방향을 제어합니다.",
    position: { x: 1800, y: 850 },
    sourceHandle: "camera-angle-out",
    edgeId: "e-camera-angle-output",
    color: "var(--port-camera-angle)",
  },
  objectAngle: {
    id: "object-angle-node",
    type: "objectAngleNode",
    label: "오브젝트 앵글",
    description: "피사체 자체의 좌우/상하 회전 방향을 구 컨트롤로 조절합니다.",
    position: { x: 2050, y: 850 },
    sourceHandle: "object-angle-out",
    edgeId: "e-object-angle-output",
    color: "var(--port-object-angle)",
  },
  lighting: {
    id: "lighting-node",
    type: "lightingNode",
    label: "조명",
    description: "장면의 빛 방향과 광질을 분리해서 제어합니다.",
    position: { x: 2300, y: 850 },
    sourceHandle: "lighting-out",
    edgeId: "e-lighting-output",
    color: "var(--port-lighting)",
  },
  gesture: {
    id: "gesture-node",
    type: "gestureNode",
    label: "표정/제스처",
    description: "표정과 몸의 에너지, 동작감을 강화합니다.",
    position: { x: 2550, y: 850 },
    sourceHandle: "gesture-out",
    edgeId: "e-gesture-output",
    color: "var(--port-gesture)",
  },
  props: {
    id: "props-node",
    type: "propsNode",
    label: "소품",
    description: "핵심 소품을 설명과 분리해서 안정적으로 고정합니다.",
    position: { x: 2800, y: 850 },
    sourceHandle: "props-out",
    edgeId: "e-props-output",
    color: "var(--port-props)",
  },
  detail: {
    id: "detail-node",
    type: "detailNode",
    label: "출력 밀도",
    description: "얼마나 단순하거나 정교하게 그릴지 제어합니다.",
    position: { x: 3050, y: 850 },
    sourceHandle: "detail-out",
    edgeId: "e-detail-output",
    color: "var(--port-detail)",
  },
} as const;

type OptionalNodeKey = keyof typeof OPTIONAL_NODE_CONFIG;
type ViewMode = "gallery" | "editor";
type NodePositionMap = Record<string, { x: number; y: number }>;
type ConsistencyElements = {
  character: string;
  object: string;
  style: string;
  composition: string;
  rules: string[];
};
type ConsistencyStatus = "pending" | "ready" | "failed";

type EditorSnapshot = {
  prompt: string;
  styles: StyleEntry[];
  activeStyleId: string | null;
  characterReferences: StyleEntry[];
  activeCharacterReferenceId: string | null;
  objectReferences: StyleEntry[];
  activeObjectReferenceId: string | null;
  ratio: string;
  resolution: string;
  composition: string;
  backgroundPrompt: string;
  constraints: string;
  mood: string;
  palette: string;
  cameraAngle: string;
  objectAngle: string;
  lighting: string;
  gesture: string;
  propsPrompt: string;
  detailLevel: string;
  englishPrompt: string;
  koreanPrompt: string;
  imageUrl: string | null;
  visibleOptionalNodes: OptionalNodeKey[];
  connectedOptionalNodes: OptionalNodeKey[];
  nodePositions?: NodePositionMap;
};

type GeneratedResult = EditorSnapshot & {
  id: string;
  title: string;
  createdAt: string;
  consistency?: ConsistencyElements;
  consistencyStatus?: ConsistencyStatus;
};

type PersistedState = {
  theme?: "light" | "dark";
  generatedResults?: GeneratedResult[];
  draft?: EditorSnapshot;
};

type FlowNode = Node<Record<string, unknown>, string>;
type FlowEdge = Edge;
type NodeRect = { x: number; y: number; width: number; height: number };

const NODE_SIZE_BY_TYPE: Record<string, { width: number; height: number }> = {
  promptNode: { width: 320, height: 240 },
  styleNode: { width: 320, height: 250 },
  referenceNode: { width: 280, height: 260 },
  ratioNode: { width: 220, height: 140 },
  resolutionNode: { width: 220, height: 140 },
  objectAngleNode: { width: 260, height: 290 },
  outputNode: { width: 380, height: 320 },
  canvasNode: { width: 380, height: 320 },
  default: { width: 220, height: 170 },
};

const OPTIONAL_NODE_LAYOUT = {
  minX: 24,
  minY: 24,
  gap: 36,
  promptAnchorOffsetX: 100,
  promptAnchorOffsetY: 16,
  candidateOffsets: [
    { x: 0, y: 220 },
    { x: 260, y: 160 },
    { x: 320, y: 20 },
    { x: -260, y: 180 },
    { x: 0, y: -220 },
    { x: 320, y: -120 },
    { x: -260, y: -100 },
    { x: 260, y: 300 },
  ],
} as const;

function getNodeSize(type: string | undefined) {
  if (!type) return NODE_SIZE_BY_TYPE.default;
  return NODE_SIZE_BY_TYPE[type] ?? NODE_SIZE_BY_TYPE.default;
}

function getNodeRect(node: FlowNode): NodeRect {
  const size = getNodeSize(node.type);
  return {
    x: node.position.x,
    y: node.position.y,
    width: size.width,
    height: size.height,
  };
}

function getOverlapArea(a: NodeRect, b: NodeRect) {
  const overlapWidth = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapHeight = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapWidth * overlapHeight;
}

function getCenterDistance(a: NodeRect, b: NodeRect) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by);
}

function findOptionalNodePosition(nodes: FlowNode[], nodeType: string, fallback: { x: number; y: number }) {
  const promptNode = nodes.find((node) => node.id === "prompt-node");
  if (!promptNode) return fallback;

  const promptSize = getNodeSize(promptNode.type);
  const optionalSize = getNodeSize(nodeType);
  const anchorX = promptNode.position.x + promptSize.width / 2 - OPTIONAL_NODE_LAYOUT.promptAnchorOffsetX;
  const anchorY = promptNode.position.y + promptSize.height / 2 - OPTIONAL_NODE_LAYOUT.promptAnchorOffsetY;

  const candidates = OPTIONAL_NODE_LAYOUT.candidateOffsets.map((offset) => ({
    x: Math.max(OPTIONAL_NODE_LAYOUT.minX, anchorX + offset.x),
    y: Math.max(OPTIONAL_NODE_LAYOUT.minY, anchorY + offset.y),
  }));

  const existingRects = nodes.map(getNodeRect);

  let bestPosition = fallback;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const rect = { ...candidate, width: optionalSize.width, height: optionalSize.height };
    const overlapPenalty = existingRects.reduce((sum, existing) => sum + getOverlapArea(rect, existing), 0);
    const proximityPenalty = existingRects.reduce((sum, existing) => {
      const minAllowedDistance =
        Math.max(rect.width, existing.width) / 2 + OPTIONAL_NODE_LAYOUT.gap;
      const distance = getCenterDistance(rect, existing);
      return distance < minAllowedDistance ? sum + (minAllowedDistance - distance) ** 2 : sum;
    }, 0);
    const anchorDistancePenalty = Math.hypot(candidate.x - anchorX, candidate.y - anchorY);
    const score = overlapPenalty * 1000 + proximityPenalty * 10 + anchorDistancePenalty;

    if (score < bestScore) {
      bestScore = score;
      bestPosition = candidate;
    }
  }

  return bestPosition;
}

const DEFAULT_SNAPSHOT: EditorSnapshot = {
  prompt: "",
  styles: [],
  activeStyleId: null,
  characterReferences: [],
  activeCharacterReferenceId: null,
  objectReferences: [],
  activeObjectReferenceId: null,
  ratio: "1:1",
  resolution: "HD",
  composition: "full-body composition with visible limbs and clear silhouette",
  backgroundPrompt: "pure white background with no environmental details",
  constraints: "no text, letters, numbers, captions, or typography anywhere",
  mood: "refined and premium mood with polished restraint",
  palette: "soft muted pastel palette with low saturation and gentle warmth",
  cameraAngle: "front-facing camera angle with direct clear presentation",
  objectAngle: "object facing forward with neutral object rotation",
  lighting: "soft diffused lighting with gentle even illumination",
  gesture: "hurried gesture with swinging arms and strong forward momentum",
  propsPrompt: "include a stack of documents or loose papers as the main prop",
  detailLevel: "balanced detail level with readable features and restrained extras",
  englishPrompt: "",
  koreanPrompt: "",
  imageUrl: null,
  visibleOptionalNodes: [],
  connectedOptionalNodes: [],
  nodePositions: {},
};

const MANDATORY_EDGES = [
  {
    id: "e-prompt-output",
    source: "prompt-node",
    sourceHandle: "prompt-out",
    target: "output-node",
    targetHandle: "general-in",
    style: { stroke: "var(--port-prompt)", strokeWidth: 3 },
  },
  {
    id: "e-style-output",
    source: "style-node",
    sourceHandle: "style-out",
    target: "output-node",
    targetHandle: "general-in",
    style: { stroke: "var(--port-style)", strokeWidth: 3 },
  },
  {
    id: "e-ratio-output",
    source: "ratio-node",
    sourceHandle: "ratio-out",
    target: "output-node",
    targetHandle: "general-in",
    style: { stroke: "var(--port-ratio)", strokeWidth: 3 },
  },
  {
    id: "e-resolution-output",
    source: "resolution-node",
    sourceHandle: "resolution-out",
    target: "output-node",
    targetHandle: "general-in",
    style: { stroke: "var(--port-resolution)", strokeWidth: 3 },
  },
];

function buildEditorNodes(optionalKeys: OptionalNodeKey[], includeCanvas: boolean): FlowNode[] {
  const baseNodes: FlowNode[] = [
    { id: "prompt-node", type: "promptNode", position: { x: 50, y: 50 }, data: {} },
    { id: "style-node", type: "styleNode", position: { x: 50, y: 300 }, data: {} },
    { id: "ratio-node", type: "ratioNode", position: { x: 50, y: 550 }, data: {} },
    { id: "resolution-node", type: "resolutionNode", position: { x: 50, y: 700 }, data: {} },
    { id: "output-node", type: "outputNode", position: { x: 450, y: 150 }, data: {} },
  ];

  const optionalNodes = optionalKeys.map((key) => {
    const config = OPTIONAL_NODE_CONFIG[key];
    return {
      id: config.id,
      type: config.type,
      position: config.position,
      data: {},
    };
  });

  return includeCanvas
    ? [
        ...baseNodes,
        ...optionalNodes,
        { id: "canvas-node", type: "canvasNode", position: { x: 850, y: 150 }, data: {} },
      ]
    : [...baseNodes, ...optionalNodes];
}

function getNodePositions(nodes: FlowNode[]): NodePositionMap {
  return nodes.reduce<NodePositionMap>((positions, node) => {
    positions[node.id] = { x: node.position.x, y: node.position.y };
    return positions;
  }, {});
}

function applyNodePositions(nodes: FlowNode[], positions?: NodePositionMap): FlowNode[] {
  if (!positions) return nodes;

  return nodes.map((node) => {
    const position = positions[node.id];
    return position ? { ...node, position } : node;
  });
}

function buildEditorEdges(connectedOptionalKeys: OptionalNodeKey[], includeCanvas: boolean): FlowEdge[] {
  const optionalEdges: FlowEdge[] = connectedOptionalKeys.map((key) => {
    const config = OPTIONAL_NODE_CONFIG[key];
    return {
      id: config.edgeId,
      source: config.id,
      sourceHandle: config.sourceHandle,
      target: "output-node",
      targetHandle: "general-in",
      style: { stroke: config.color, strokeWidth: 3 },
    };
  });

  return includeCanvas
    ? [
        ...MANDATORY_EDGES,
        ...optionalEdges,
        {
          id: "e-prompt-canvas",
          source: "output-node",
          sourceHandle: "output-out",
          target: "canvas-node",
          targetHandle: "canvas-in",
          style: { stroke: "var(--text-primary)", strokeWidth: 3 },
          animated: false,
        },
      ]
    : [...MANDATORY_EDGES, ...optionalEdges];
}

function createResultTitle(prompt: string, englishPrompt: string) {
  const source = prompt.trim() || englishPrompt.trim() || "새 브랜드 이미지";
  return source.slice(0, 42);
}

function createFallbackDisplayTitle(prompt: string, englishPrompt: string, koreanPrompt: string) {
  const source = (koreanPrompt || prompt || englishPrompt || "새 브랜드 이미지")
    .replace(/\s+/g, " ")
    .trim();
  const firstClause = source.split(/[,.!?:;\n]/)[0]?.trim() || source;
  return firstClause.length > 24 ? `${firstClause.slice(0, 24).trim()}…` : firstClause;
}

function isLegacyGeneratedTitle(result: Pick<GeneratedResult, "title" | "prompt" | "englishPrompt">) {
  const legacyTitle = createResultTitle(result.prompt, result.englishPrompt);
  return !result.title?.trim() || result.title === legacyTitle;
}

function getDisplayTitle(result: Pick<GeneratedResult, "title" | "prompt" | "englishPrompt" | "koreanPrompt">) {
  if (!isLegacyGeneratedTitle(result as Pick<GeneratedResult, "title" | "prompt" | "englishPrompt">)) {
    return result.title.trim();
  }
  return createFallbackDisplayTitle(result.prompt, result.englishPrompt, result.koreanPrompt);
}

function formatDurationLabel(totalSeconds: number | null) {
  if (totalSeconds === null) return null;
  if (totalSeconds < 60) return `${totalSeconds}초`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes}분` : `${minutes}분 ${seconds}초`;
}

function getActiveStylePrompt(result: GeneratedResult) {
  if (!result.activeStyleId) return "";
  return result.styles.find((styleEntry) => styleEntry.id === result.activeStyleId)?.prompt || "";
}

function getPreviewTitle(activeResult: GeneratedResult | null, prompt: string, englishPrompt: string) {
  if (activeResult) return getDisplayTitle(activeResult);
  return createFallbackDisplayTitle(prompt, englishPrompt, "");
}

function getPreviewPrompt(activeResult: GeneratedResult | null, englishPrompt: string) {
  return activeResult?.englishPrompt ?? englishPrompt ?? "";
}

function getPreviewKoreanPrompt(activeResult: GeneratedResult | null, koreanPrompt: string) {
  return activeResult?.koreanPrompt ?? koreanPrompt ?? "";
}

function emptyConsistency(): ConsistencyElements {
  return {
    character: "",
    object: "",
    style: "",
    composition: "",
    rules: [],
  };
}

function createReferenceEntryFromConsistency(kind: "character" | "object" | "style", prompt: string, imageUrl: string): StyleEntry {
  const labelPrefix = kind === "character" ? "캐릭터" : kind === "object" ? "오브젝트" : "스타일";
  return {
    id: `${kind}-consistency-${Date.now()}`,
    imageUrl,
    prompt,
    label: `${labelPrefix} 앨리먼트`,
  };
}

function appendObjectAnglePrompt(englishPrompt: string, objectAngle: string | null | undefined) {
  const nextObjectAngle = objectAngle?.trim();
  if (!nextObjectAngle || nextObjectAngle === DEFAULT_SNAPSHOT.objectAngle) return englishPrompt;
  if (englishPrompt.includes(nextObjectAngle)) return englishPrompt;
  if (englishPrompt.includes("mandatory object orientation")) return englishPrompt;

  return [englishPrompt.trim(), nextObjectAngle].filter(Boolean).join(", ");
}

function appendConsistencyReferences(
  englishPrompt: string,
  characterReference: string | null | undefined,
  objectReference: string | null | undefined,
) {
  const parts = [englishPrompt.trim()].filter(Boolean);
  const nextCharacterReference = characterReference?.trim();
  const nextObjectReference = objectReference?.trim();

  if (nextCharacterReference && !englishPrompt.includes(nextCharacterReference)) {
    parts.push(`fixed character reference: ${nextCharacterReference}`);
  }
  if (nextObjectReference && !englishPrompt.includes(nextObjectReference)) {
    parts.push(`fixed object reference: ${nextObjectReference}`);
  }

  return parts.join(", ");
}

function mergeGeneratedResults(
  localResults: GeneratedResult[] = [],
  fileResults: GeneratedResult[] = [],
) {
  const merged = new Map<string, GeneratedResult>();
  for (const result of [...fileResults, ...localResults]) {
    if (result?.id) merged.set(result.id, result);
  }
  return [...merged.values()].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function readLocalPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      theme: parsed.theme,
      generatedResults: Array.isArray(parsed.generatedResults) ? parsed.generatedResults : [],
      draft: parsed.draft,
    };
  } catch {
    return {};
  }
}

async function readFilePersistedState(): Promise<PersistedState> {
  try {
    const res = await fetch("/api/gallery", { cache: "no-store" });
    if (!res.ok) return {};
    const parsed = (await res.json()) as PersistedState;
    return {
      theme: parsed.theme,
      generatedResults: Array.isArray(parsed.generatedResults) ? parsed.generatedResults : [],
      draft: parsed.draft,
    };
  } catch {
    return {};
  }
}

async function writeFilePersistedState(payload: PersistedState) {
  try {
    await fetch("/api/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Keep the UI responsive even if the local file DB is temporarily unavailable.
  }
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <FlowContent />
    </ReactFlowProvider>
  );
}

function FlowContent() {
  const hasLoadedRef = useRef(false);
  const titleBackfillRequestedRef = useRef<Set<string>>(new Set());
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [activeResultId, setActiveResultId] = useState<string | null>(null);
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewPromptCopied, setIsPreviewPromptCopied] = useState(false);
  const [isPreviewImageDownloaded, setIsPreviewImageDownloaded] = useState(false);
  const [previewPromptLanguage, setPreviewPromptLanguage] = useState<"ko" | "en">("en");
  const [isPreviewKoreanPromptLoading, setIsPreviewKoreanPromptLoading] = useState(false);

  const [prompt, setPrompt] = useState(DEFAULT_SNAPSHOT.prompt);
  const [styles, setStyles] = useState<StyleEntry[]>(DEFAULT_SNAPSHOT.styles);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(DEFAULT_SNAPSHOT.activeStyleId);
  const [characterReferences, setCharacterReferences] = useState<StyleEntry[]>(DEFAULT_SNAPSHOT.characterReferences);
  const [activeCharacterReferenceId, setActiveCharacterReferenceId] = useState<string | null>(DEFAULT_SNAPSHOT.activeCharacterReferenceId);
  const [objectReferences, setObjectReferences] = useState<StyleEntry[]>(DEFAULT_SNAPSHOT.objectReferences);
  const [activeObjectReferenceId, setActiveObjectReferenceId] = useState<string | null>(DEFAULT_SNAPSHOT.activeObjectReferenceId);
  const [ratio, setRatio] = useState(DEFAULT_SNAPSHOT.ratio);
  const [resolution, setResolution] = useState(DEFAULT_SNAPSHOT.resolution);
  const [composition, setComposition] = useState(DEFAULT_SNAPSHOT.composition);
  const [backgroundPrompt, setBackgroundPrompt] = useState(DEFAULT_SNAPSHOT.backgroundPrompt);
  const [constraints, setConstraints] = useState(DEFAULT_SNAPSHOT.constraints);
  const [mood, setMood] = useState(DEFAULT_SNAPSHOT.mood);
  const [palette, setPalette] = useState(DEFAULT_SNAPSHOT.palette);
  const [cameraAngle, setCameraAngle] = useState(DEFAULT_SNAPSHOT.cameraAngle);
  const [objectAngle, setObjectAngle] = useState(DEFAULT_SNAPSHOT.objectAngle);
  const [lighting, setLighting] = useState(DEFAULT_SNAPSHOT.lighting);
  const [gesture, setGesture] = useState(DEFAULT_SNAPSHOT.gesture);
  const [propsPrompt, setPropsPrompt] = useState(DEFAULT_SNAPSHOT.propsPrompt);
  const [detailLevel, setDetailLevel] = useState(DEFAULT_SNAPSHOT.detailLevel);
  const [englishPrompt, setEnglishPrompt] = useState(DEFAULT_SNAPSHOT.englishPrompt);
  const [koreanPrompt, setKoreanPrompt] = useState(DEFAULT_SNAPSHOT.koreanPrompt);
  const [imageUrl, setImageUrl] = useState<string | null>(DEFAULT_SNAPSHOT.imageUrl);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateElapsedSeconds, setTranslateElapsedSeconds] = useState(0);
  const [lastTranslateDurationSeconds, setLastTranslateDurationSeconds] = useState<number | null>(null);
  const [generateElapsedSeconds, setGenerateElapsedSeconds] = useState(0);
  const [lastGenerateDurationSeconds, setLastGenerateDurationSeconds] = useState<number | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>(
    buildEditorNodes(DEFAULT_SNAPSHOT.visibleOptionalNodes, false),
  );
  const [edges, setEdges] = useState<FlowEdge[]>(
    buildEditorEdges(DEFAULT_SNAPSHOT.connectedOptionalNodes, false),
  );
  const translateStartedAtRef = useRef<number | null>(null);
  const generateStartedAtRef = useRef<number | null>(null);
  const nodesRef = useRef<FlowNode[]>(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const applySnapshotToEditor = useCallback((snapshot: EditorSnapshot) => {
    setPrompt(snapshot.prompt);
    setStyles(snapshot.styles);
    setActiveStyleId(snapshot.activeStyleId);
    setCharacterReferences(snapshot.characterReferences ?? []);
    setActiveCharacterReferenceId(snapshot.activeCharacterReferenceId ?? null);
    setObjectReferences(snapshot.objectReferences ?? []);
    setActiveObjectReferenceId(snapshot.activeObjectReferenceId ?? null);
    setRatio(snapshot.ratio);
    setResolution(snapshot.resolution);
    setComposition(snapshot.composition);
    setBackgroundPrompt(snapshot.backgroundPrompt);
    setConstraints(snapshot.constraints);
    setMood(snapshot.mood);
    setPalette(snapshot.palette);
    setCameraAngle(snapshot.cameraAngle);
    setObjectAngle(snapshot.objectAngle ?? DEFAULT_SNAPSHOT.objectAngle);
    setLighting(snapshot.lighting);
    setGesture(snapshot.gesture);
    setPropsPrompt(snapshot.propsPrompt);
    setDetailLevel(snapshot.detailLevel);
    setEnglishPrompt(snapshot.englishPrompt);
    setKoreanPrompt(snapshot.koreanPrompt);
    setImageUrl(snapshot.imageUrl);
    setError(false);
    setNodes(
      applyNodePositions(
        buildEditorNodes(snapshot.visibleOptionalNodes, Boolean(snapshot.imageUrl)),
        snapshot.nodePositions,
      ),
    );
    setEdges(buildEditorEdges(snapshot.connectedOptionalNodes, Boolean(snapshot.imageUrl)));
  }, []);

  const captureCurrentSnapshot = useCallback(
    (nextImageUrl?: string | null): EditorSnapshot => {
      const visibleOptionalNodes = (Object.keys(OPTIONAL_NODE_CONFIG) as OptionalNodeKey[]).filter((key) =>
        nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG[key].id),
      );
      const connectedOptionalNodes = (Object.keys(OPTIONAL_NODE_CONFIG) as OptionalNodeKey[]).filter((key) =>
        edges.some(
          (edge) =>
            edge.source === OPTIONAL_NODE_CONFIG[key].id && edge.target === "output-node",
        ),
      );

      return {
        prompt,
        styles,
        activeStyleId,
        characterReferences,
        activeCharacterReferenceId,
        objectReferences,
        activeObjectReferenceId,
        ratio,
        resolution,
        composition,
        backgroundPrompt,
        constraints,
        mood,
        palette,
        cameraAngle,
        objectAngle,
        lighting,
        gesture,
        propsPrompt,
        detailLevel,
        englishPrompt,
        koreanPrompt,
        imageUrl: nextImageUrl === undefined ? imageUrl : nextImageUrl,
        visibleOptionalNodes,
        connectedOptionalNodes,
        nodePositions: getNodePositions(nodes),
      };
    },
    [
      prompt,
      styles,
      activeStyleId,
      characterReferences,
      activeCharacterReferenceId,
      objectReferences,
      activeObjectReferenceId,
      ratio,
      resolution,
      composition,
      backgroundPrompt,
      constraints,
      mood,
      palette,
      cameraAngle,
      objectAngle,
      lighting,
      gesture,
      propsPrompt,
      detailLevel,
      englishPrompt,
      koreanPrompt,
      imageUrl,
      nodes,
      edges,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPersistedState() {
      const localState = readLocalPersistedState();
      const fileState = await readFilePersistedState();
      const mergedResults = mergeGeneratedResults(
        localState.generatedResults,
        fileState.generatedResults,
      );
      const saved: PersistedState = {
        theme: localState.theme || fileState.theme,
        generatedResults: mergedResults,
        draft: localState.draft || fileState.draft,
      };

      if (cancelled) return;
      queueMicrotask(() => {
        if (cancelled) return;
        if (saved.theme) setTheme(saved.theme);
        if (saved.generatedResults?.length) setGeneratedResults(saved.generatedResults);
        if (saved.draft) applySnapshotToEditor(saved.draft);
        hasLoadedRef.current = true;
      });

      const localCount = localState.generatedResults?.length ?? 0;
      const fileCount = fileState.generatedResults?.length ?? 0;
      if (mergedResults.length > fileCount || localCount > 0) {
        await writeFilePersistedState(saved);
      }
    }

    void loadPersistedState().catch(() => {
      if (!cancelled) hasLoadedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [applySnapshotToEditor]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    const timeoutId = window.setTimeout(() => {
      try {
        const payload = {
          theme,
          generatedResults,
          draft: captureCurrentSnapshot(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        void writeFilePersistedState(payload);
      } catch {
        // ignore storage failures
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [theme, generatedResults, captureCurrentSnapshot]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!previewImageUrl) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImageUrl(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImageUrl]);

  useEffect(() => {
    if (!isPreviewPromptCopied) return;
    const timeoutId = window.setTimeout(() => setIsPreviewPromptCopied(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [isPreviewPromptCopied]);

  useEffect(() => {
    if (!isPreviewImageDownloaded) return;
    const timeoutId = window.setTimeout(() => setIsPreviewImageDownloaded(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [isPreviewImageDownloaded]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const connectedState = useMemo(() => {
    const isPromptConnected = edges.some((e) => e.target === "output-node" && e.source === "prompt-node");
    const isStyleConnected = edges.some((e) => e.target === "output-node" && e.source === "style-node");
    const isRatioConnected = edges.some((e) => e.target === "output-node" && e.source === "ratio-node");
    const isResolutionConnected = edges.some((e) => e.target === "output-node" && e.source === "resolution-node");

    const optionals = Object.fromEntries(
      (Object.keys(OPTIONAL_NODE_CONFIG) as OptionalNodeKey[]).map((key) => [
        key,
        edges.some((e) => e.target === "output-node" && e.source === OPTIONAL_NODE_CONFIG[key].id),
      ]),
    ) as Record<OptionalNodeKey, boolean>;

    return {
      isPromptConnected,
      isStyleConnected,
      isRatioConnected,
      isResolutionConnected,
      ...optionals,
    };
  }, [edges]);

  const hasAnyConnection = useMemo(
    () =>
      connectedState.isPromptConnected ||
      connectedState.isStyleConnected ||
      connectedState.isRatioConnected ||
      connectedState.isResolutionConnected ||
      (Object.keys(OPTIONAL_NODE_CONFIG) as OptionalNodeKey[]).some((key) => connectedState[key]),
    [connectedState],
  );

  const activeCharacterReferencePrompt = useMemo(
    () => characterReferences.find((entry) => entry.id === activeCharacterReferenceId)?.prompt || "",
    [characterReferences, activeCharacterReferenceId],
  );
  const activeObjectReferencePrompt = useMemo(
    () => objectReferences.find((entry) => entry.id === activeObjectReferenceId)?.prompt || "",
    [objectReferences, activeObjectReferenceId],
  );
  const visibleEnglishPrompt = hasAnyConnection
    ? appendConsistencyReferences(
        appendObjectAnglePrompt(englishPrompt, connectedState.objectAngle ? objectAngle : null),
        connectedState.characterReference ? activeCharacterReferencePrompt : null,
        connectedState.objectReference ? activeObjectReferencePrompt : null,
      )
    : "";
  const visibleKoreanPrompt = hasAnyConnection ? koreanPrompt : "";

  const requestKoreanPromptInBackground = useCallback(
    async (resultId: string, nextEnglishPrompt: string) => {
      if (!nextEnglishPrompt.trim()) return;

      try {
        const res = await fetch("/api/translate-korean", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ englishPrompt: nextEnglishPrompt }),
        });

        const data = (await res.json()) as { koreanPrompt?: string };
        if (typeof data.koreanPrompt !== "string") return;

        setGeneratedResults((prev) =>
          prev.map((result) =>
            result.id === resultId ? { ...result, koreanPrompt: data.koreanPrompt || "" } : result,
          ),
        );
        setKoreanPrompt((prev) => (prev ? prev : data.koreanPrompt || ""));
      } catch (error) {
        console.error(error);
      }
    },
    [],
  );

  const requestTitleInBackground = useCallback(
    async (result: GeneratedResult) => {
      if (titleBackfillRequestedRef.current.has(result.id)) return;
      titleBackfillRequestedRef.current.add(result.id);

      try {
        const res = await fetch("/api/generate-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: result.prompt,
            englishPrompt: result.englishPrompt,
            koreanPrompt: result.koreanPrompt,
          }),
        });

        const data = (await res.json()) as { title?: string };
        if (!data.title?.trim()) return;

        setGeneratedResults((prev) =>
          prev.map((entry) => (entry.id === result.id ? { ...entry, title: data.title!.trim() } : entry)),
        );
      } catch (error) {
        console.error(error);
      }
    },
    [],
  );

  const requestConsistencyInBackground = useCallback(
    async (resultId: string, nextImageUrl: string, nextPrompt: string) => {
      if (!nextImageUrl.trim()) return;

      setGeneratedResults((prev) =>
        prev.map((result) =>
          result.id === resultId ? { ...result, consistencyStatus: "pending" } : result,
        ),
      );

      try {
        const res = await fetch("/api/analyze-consistency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: nextImageUrl, prompt: nextPrompt }),
        });
        const data = (await res.json()) as Partial<ConsistencyElements> & { error?: string };
        if (!res.ok) throw new Error(data.error || "일관성 앨리먼트 분석 실패");

        const consistency: ConsistencyElements = {
          character: typeof data.character === "string" ? data.character.trim() : "",
          object: typeof data.object === "string" ? data.object.trim() : "",
          style: typeof data.style === "string" ? data.style.trim() : "",
          composition: typeof data.composition === "string" ? data.composition.trim() : "",
          rules: Array.isArray(data.rules) ? data.rules.filter((rule): rule is string => typeof rule === "string") : [],
        };

        setGeneratedResults((prev) =>
          prev.map((result) =>
            result.id === resultId ? { ...result, consistency, consistencyStatus: "ready" } : result,
          ),
        );
      } catch (error) {
        console.error(error);
        setGeneratedResults((prev) =>
          prev.map((result) =>
            result.id === resultId ? { ...result, consistencyStatus: "failed" } : result,
          ),
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasAnyConnection) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsTranslating(true);
      try {
        const activeStyle = styles.find((styleEntry) => styleEntry.id === activeStyleId);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: connectedState.isPromptConnected ? prompt : "",
            style: connectedState.isStyleConnected ? (activeStyle?.prompt || null) : null,
            characterReference: connectedState.characterReference ? activeCharacterReferencePrompt : null,
            objectReference: connectedState.objectReference ? activeObjectReferencePrompt : null,
            ratio: connectedState.isRatioConnected ? ratio : null,
            resolution: connectedState.isResolutionConnected ? resolution : null,
            composition: connectedState.composition ? composition : null,
            background: connectedState.background ? backgroundPrompt : null,
            constraints: connectedState.constraints ? constraints : null,
            mood: connectedState.mood ? mood : null,
            palette: connectedState.palette ? palette : null,
            cameraAngle: connectedState.cameraAngle ? cameraAngle : null,
            objectAngle: connectedState.objectAngle ? objectAngle : null,
            lighting: connectedState.lighting ? lighting : null,
            gesture: connectedState.gesture ? gesture : null,
            propsPrompt: connectedState.props ? propsPrompt : null,
            detailLevel: connectedState.detail ? detailLevel : null,
          }),
          signal: controller.signal,
        });

        const data = (await res.json()) as { englishPrompt?: string };
        if (data.englishPrompt) {
          setEnglishPrompt(data.englishPrompt);
        }
      } catch (error: unknown) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error(error);
        }
      } finally {
        setIsTranslating(false);
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    prompt,
    styles,
    activeStyleId,
    activeCharacterReferencePrompt,
    activeObjectReferencePrompt,
    ratio,
    resolution,
    composition,
    backgroundPrompt,
    constraints,
    mood,
    palette,
    cameraAngle,
    objectAngle,
    lighting,
    gesture,
    propsPrompt,
    detailLevel,
    connectedState,
    hasAnyConnection,
  ]);

  useEffect(() => {
    const pendingResults = generatedResults.filter((result) => isLegacyGeneratedTitle(result));
    if (pendingResults.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      for (const result of pendingResults) {
        void requestTitleInBackground(result);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [generatedResults, requestTitleInBackground]);

  useEffect(() => {
    if (!isTranslating) {
      if (translateStartedAtRef.current !== null) {
        const elapsed = Math.max(1, Math.round((Date.now() - translateStartedAtRef.current) / 1000));
        setLastTranslateDurationSeconds(elapsed);
        setTranslateElapsedSeconds(0);
        translateStartedAtRef.current = null;
      }
      return;
    }

    translateStartedAtRef.current = Date.now();
    setTranslateElapsedSeconds(0);
    const intervalId = window.setInterval(() => {
      if (translateStartedAtRef.current === null) return;
      setTranslateElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - translateStartedAtRef.current) / 1000)),
      );
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isTranslating]);

  useEffect(() => {
    if (!isGenerating) {
      if (generateStartedAtRef.current !== null) {
        const elapsed = Math.max(1, Math.round((Date.now() - generateStartedAtRef.current) / 1000));
        setLastGenerateDurationSeconds(elapsed);
        setGenerateElapsedSeconds(0);
        generateStartedAtRef.current = null;
      }
      return;
    }

    generateStartedAtRef.current = Date.now();
    setGenerateElapsedSeconds(0);
    const intervalId = window.setInterval(() => {
      if (generateStartedAtRef.current === null) return;
      setGenerateElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - generateStartedAtRef.current) / 1000)),
      );
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isGenerating]);

  const handleGenerate = useCallback(async () => {
    const activeStyle = connectedState.isStyleConnected
      ? styles.find((styleEntry) => styleEntry.id === activeStyleId)
      : null;
    const effectivePrompt = connectedState.isPromptConnected ? prompt : "";

    if ((!effectivePrompt.trim() && !activeStyle) || isGenerating || isTranslating) return;

    setIsGenerating(true);
    setError(false);

    setNodes((prevNodes) => {
      if (prevNodes.some((node) => node.id === "canvas-node")) return prevNodes;
      return [...prevNodes, { id: "canvas-node", type: "canvasNode", position: { x: 850, y: 150 }, data: {} }];
    });

    setEdges((prevEdges) => {
      if (prevEdges.some((edge) => edge.id === "e-prompt-canvas")) return prevEdges;
      return [
        ...prevEdges,
        {
          id: "e-prompt-canvas",
          source: "output-node",
          sourceHandle: "output-out",
          target: "canvas-node",
          targetHandle: "canvas-in",
          style: { stroke: "var(--text-primary)", strokeWidth: 3 },
          animated: false,
        },
      ];
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: effectivePrompt,
          style: activeStyle?.prompt || null,
          characterReference: connectedState.characterReference ? activeCharacterReferencePrompt : null,
          objectReference: connectedState.objectReference ? activeObjectReferencePrompt : null,
          ratio,
          resolution,
          composition: connectedState.composition ? composition : null,
          background: connectedState.background ? backgroundPrompt : null,
          constraints: connectedState.constraints ? constraints : null,
          mood: connectedState.mood ? mood : null,
          palette: connectedState.palette ? palette : null,
          cameraAngle: connectedState.cameraAngle ? cameraAngle : null,
          objectAngle: connectedState.objectAngle ? objectAngle : null,
          lighting: connectedState.lighting ? lighting : null,
          gesture: connectedState.gesture ? gesture : null,
          propsPrompt: connectedState.props ? propsPrompt : null,
          detailLevel: connectedState.detail ? detailLevel : null,
          prebuiltPrompt: visibleEnglishPrompt || null,
        }),
      });

      const data = (await res.json()) as {
        url?: string;
        title?: string;
        englishPrompt?: string;
        koreanPrompt?: string;
      };
      if (!data.url) {
        setError(true);
        return;
      }

      setImageUrl(data.url);
      const snapshot = {
        ...captureCurrentSnapshot(data.url),
        englishPrompt: data.englishPrompt?.trim() || visibleEnglishPrompt,
        koreanPrompt: data.koreanPrompt?.trim() || "",
      };

      const resultId = `result-${Date.now()}`;
      const nextTitle = data.title?.trim() || createFallbackDisplayTitle(snapshot.prompt, snapshot.englishPrompt, snapshot.koreanPrompt);
      setGeneratedResults((prev) => {
        const nextResult: GeneratedResult = {
          ...snapshot,
          id: resultId,
          title: nextTitle,
          createdAt: new Date().toISOString(),
          consistencyStatus: "pending",
        };

        setActiveResultId(resultId);
        return [nextResult, ...prev];
      });
      void requestConsistencyInBackground(resultId, data.url, snapshot.englishPrompt);
      if (data.englishPrompt?.trim()) {
        setEnglishPrompt(data.englishPrompt.trim());
      }
      if (data.koreanPrompt?.trim()) {
        setKoreanPrompt(data.koreanPrompt.trim());
      }
    } catch {
      setError(true);
    } finally {
      setIsGenerating(false);
    }
  }, [
    activeStyleId,
    activeCharacterReferencePrompt,
    activeObjectReferencePrompt,
    backgroundPrompt,
    captureCurrentSnapshot,
    composition,
    connectedState,
    constraints,
    detailLevel,
    gesture,
    isGenerating,
    isTranslating,
    lighting,
    mood,
    palette,
    prompt,
    propsPrompt,
    requestConsistencyInBackground,
    ratio,
    resolution,
    styles,
    cameraAngle,
    objectAngle,
    visibleEnglishPrompt,
  ]);

  const addOptionalNode = useCallback((key: OptionalNodeKey) => {
    const config = OPTIONAL_NODE_CONFIG[key];
    setNodes((prev) => {
      if (prev.some((node) => node.id === config.id)) return prev;
      const position = findOptionalNodePosition(prev, config.type, config.position);
      return [...prev, { id: config.id, type: config.type, position, data: {} }];
    });
    setEdges((prev) => {
      if (prev.some((edge) => edge.id === config.edgeId)) return prev;
      return [
        ...prev,
        {
          id: config.edgeId,
          source: config.id,
          sourceHandle: config.sourceHandle,
          target: "output-node",
          targetHandle: "general-in",
          style: { stroke: config.color, strokeWidth: 3 },
        },
      ];
    });
  }, []);

  const removeOptionalNode = useCallback((key: OptionalNodeKey) => {
    const config = OPTIONAL_NODE_CONFIG[key];
    setNodes((prev) => prev.filter((node) => node.id !== config.id));
    setEdges((prev) => prev.filter((edge) => edge.source !== config.id && edge.target !== config.id));
  }, []);

  const openPreviewImage = useCallback((nextPreviewImageUrl: string) => {
    setPreviewPromptLanguage("en");
    setPreviewImageUrl(nextPreviewImageUrl);
  }, []);

  const activeOptionalNodes = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(OPTIONAL_NODE_CONFIG) as OptionalNodeKey[]).map((key) => [
          key,
          nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG[key].id),
        ]),
      ) as Record<OptionalNodeKey, boolean>,
    [nodes],
  );

  const nodeTypes = useMemo(
    () => ({
      promptNode: PromptNode,
      styleNode: StyleNode,
      referenceNode: ReferenceNode,
      ratioNode: RatioNode,
      resolutionNode: ResolutionNode,
      compositionNode: CompositionNode,
      backgroundNode: BackgroundNode,
      constraintNode: ConstraintNode,
      moodNode: MoodNode,
      paletteNode: PaletteNode,
      cameraAngleNode: CameraAngleNode,
      objectAngleNode: ObjectAngleNode,
      lightingNode: LightingNode,
      gestureNode: GestureNode,
      propsNode: PropsNode,
      detailNode: DetailNode,
      outputNode: OutputNode,
      canvasNode: CanvasNode,
    }),
    [],
  );

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onNodeDragStop = useCallback<OnNodeDrag<FlowNode>>(() => {
    if (!activeResultId) return;

    const nodePositions = getNodePositions(nodesRef.current);
    setGeneratedResults((prevResults) =>
      prevResults.map((result) =>
        result.id === activeResultId ? { ...result, nodePositions } : result,
      ),
    );
  }, [activeResultId]);

  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => {
    setEdges((prev) => applyEdgeChanges(changes, prev));
  }, []);
  const onConnect = useCallback((params: Connection) => {
      let targetHandle = params.targetHandle;
      if (params.target === "output-node") targetHandle = "general-in";

      let style = { stroke: "#94a3b8", strokeWidth: 2 };
      if (params.sourceHandle === "prompt-out") style = { stroke: "var(--port-prompt)", strokeWidth: 3 };
      if (params.sourceHandle === "style-out") style = { stroke: "var(--port-style)", strokeWidth: 3 };
      if (params.sourceHandle === "ratio-out") style = { stroke: "var(--port-ratio)", strokeWidth: 3 };
      if (params.sourceHandle === "resolution-out") style = { stroke: "var(--port-resolution)", strokeWidth: 3 };
      for (const key of Object.keys(OPTIONAL_NODE_CONFIG) as OptionalNodeKey[]) {
        if (params.sourceHandle === OPTIONAL_NODE_CONFIG[key].sourceHandle) {
          style = { stroke: OPTIONAL_NODE_CONFIG[key].color, strokeWidth: 3 };
        }
      }

      setEdges((prev) => {
        const filtered = prev.filter(
          (edge) => !(edge.source === params.source && edge.target === "output-node"),
        );
        return addEdge({ ...params, targetHandle, style }, filtered);
      });
    }, []);

  const finalNodes = useMemo(() => {
    return nodes.map((node) => {
      const baseData = node.data || {};
      if (node.id === "prompt-node") {
        return { ...node, data: { ...baseData, prompt, onChange: setPrompt } };
      }
      if (node.id === "style-node") {
        return { ...node, data: { ...baseData, styles, activeStyleId, setStyles, setActiveStyleId } };
      }
      if (node.id === "character-reference-node") {
        return {
          ...node,
          data: {
            ...baseData,
            kind: "character",
            references: characterReferences,
            activeReferenceId: activeCharacterReferenceId,
            setReferences: setCharacterReferences,
            setActiveReferenceId: setActiveCharacterReferenceId,
            onRemove: () => removeOptionalNode("characterReference"),
          },
        };
      }
      if (node.id === "object-reference-node") {
        return {
          ...node,
          data: {
            ...baseData,
            kind: "object",
            references: objectReferences,
            activeReferenceId: activeObjectReferenceId,
            setReferences: setObjectReferences,
            setActiveReferenceId: setActiveObjectReferenceId,
            onRemove: () => removeOptionalNode("objectReference"),
          },
        };
      }
      if (node.id === "ratio-node") {
        return { ...node, data: { ...baseData, ratio, setRatio } };
      }
      if (node.id === "resolution-node") {
        return { ...node, data: { ...baseData, resolution, setResolution } };
      }
      if (node.id === "composition-node") {
        return { ...node, data: { ...baseData, composition, setComposition, onRemove: () => removeOptionalNode("composition") } };
      }
      if (node.id === "background-node") {
        return { ...node, data: { ...baseData, backgroundPrompt, setBackgroundPrompt, onRemove: () => removeOptionalNode("background") } };
      }
      if (node.id === "constraint-node") {
        return { ...node, data: { ...baseData, constraints, setConstraints, onRemove: () => removeOptionalNode("constraints") } };
      }
      if (node.id === "mood-node") {
        return { ...node, data: { ...baseData, mood, setMood, onRemove: () => removeOptionalNode("mood") } };
      }
      if (node.id === "palette-node") {
        return { ...node, data: { ...baseData, palette, setPalette, onRemove: () => removeOptionalNode("palette") } };
      }
      if (node.id === "camera-angle-node") {
        return { ...node, data: { ...baseData, cameraAngle, setCameraAngle, onRemove: () => removeOptionalNode("cameraAngle") } };
      }
      if (node.id === "object-angle-node") {
        return { ...node, data: { ...baseData, objectAngle, setObjectAngle, onRemove: () => removeOptionalNode("objectAngle") } };
      }
      if (node.id === "lighting-node") {
        return { ...node, data: { ...baseData, lighting, setLighting, onRemove: () => removeOptionalNode("lighting") } };
      }
      if (node.id === "gesture-node") {
        return { ...node, data: { ...baseData, gesture, setGesture, onRemove: () => removeOptionalNode("gesture") } };
      }
      if (node.id === "props-node") {
        return { ...node, data: { ...baseData, propsPrompt, setPropsPrompt, onRemove: () => removeOptionalNode("props") } };
      }
      if (node.id === "detail-node") {
        return { ...node, data: { ...baseData, detailLevel, setDetailLevel, onRemove: () => removeOptionalNode("detail") } };
      }
      if (node.id === "output-node") {
        return {
          ...node,
          data: {
            ...baseData,
            prompt,
            ratio,
            resolution,
            englishPrompt: visibleEnglishPrompt,
            isTranslating,
            translateElapsedLabel: formatDurationLabel(translateElapsedSeconds),
            lastTranslateDurationLabel: formatDurationLabel(lastTranslateDurationSeconds),
            onGenerate: handleGenerate,
            canGenerate:
              !isTranslating &&
              ((connectedState.isPromptConnected && !!prompt.trim()) ||
                (connectedState.isStyleConnected && !!activeStyleId)),
            isGenerating,
            generateElapsedLabel: formatDurationLabel(generateElapsedSeconds),
            lastGenerateDurationLabel: formatDurationLabel(lastGenerateDurationSeconds),
          },
        };
      }
      if (node.id === "canvas-node") {
        return {
          ...node,
          data: {
            ...baseData,
            imageUrl,
            error,
            isGenerating,
            ratio,
            generateElapsedLabel: formatDurationLabel(generateElapsedSeconds),
            lastGenerateDurationLabel: formatDurationLabel(lastGenerateDurationSeconds),
            onPreviewImage: openPreviewImage,
          },
        };
      }
      return node;
    });
  }, [
    nodes,
    prompt,
    styles,
    activeStyleId,
    characterReferences,
    activeCharacterReferenceId,
    objectReferences,
    activeObjectReferenceId,
    ratio,
    resolution,
    composition,
    backgroundPrompt,
    constraints,
    mood,
    palette,
    cameraAngle,
    objectAngle,
    lighting,
    gesture,
    propsPrompt,
    detailLevel,
    isTranslating,
    handleGenerate,
    isGenerating,
    imageUrl,
    error,
    connectedState,
    openPreviewImage,
    removeOptionalNode,
    visibleEnglishPrompt,
    translateElapsedSeconds,
    lastTranslateDurationSeconds,
    generateElapsedSeconds,
    lastGenerateDurationSeconds,
  ]);

  const startNewGeneration = useCallback(() => {
    applySnapshotToEditor(DEFAULT_SNAPSHOT);
    setActiveResultId(null);
    setViewMode("editor");
  }, [applySnapshotToEditor]);

  const openResultInEditor = useCallback((result: GeneratedResult) => {
    applySnapshotToEditor(result);
    setActiveResultId(result.id);
    setViewMode("editor");
  }, [applySnapshotToEditor]);

  const activeResult = useMemo(
    () => generatedResults.find((result) => result.id === activeResultId) || null,
    [generatedResults, activeResultId],
  );
  const activePreviewResult = useMemo(
    () => {
      if (activeResult && (!previewImageUrl || activeResult.imageUrl === previewImageUrl)) return activeResult;
      return generatedResults.find((result) => result.imageUrl === previewImageUrl) || activeResult;
    },
    [activeResult, generatedResults, previewImageUrl],
  );

  const previewTitle = useMemo(
    () => getPreviewTitle(activePreviewResult, prompt, visibleEnglishPrompt),
    [activePreviewResult, prompt, visibleEnglishPrompt],
  );

  const previewPrompt = useMemo(
    () => getPreviewPrompt(activePreviewResult, visibleEnglishPrompt),
    [activePreviewResult, visibleEnglishPrompt],
  );

  const previewKoreanPrompt = useMemo(
    () => getPreviewKoreanPrompt(activePreviewResult, visibleKoreanPrompt),
    [activePreviewResult, visibleKoreanPrompt],
  );

  const activePreviewPrompt = (previewPromptLanguage === "ko" ? previewKoreanPrompt : previewPrompt) ?? "";
  const activePreviewConsistency = activePreviewResult?.consistency ?? emptyConsistency();
  const canAnalyzePreviewConsistency = Boolean(
    activePreviewResult?.id &&
    previewImageUrl &&
    activePreviewResult?.consistencyStatus !== "pending",
  );

  const handlePreviewPromptLanguageChange = useCallback(
    async (language: "ko" | "en") => {
      setPreviewPromptLanguage(language);

      if (language !== "ko") return;
      if (!previewImageUrl) return;
      if (!previewPrompt.trim()) return;
      if (previewKoreanPrompt.trim()) return;
      if (isPreviewKoreanPromptLoading) return;

      setIsPreviewKoreanPromptLoading(true);
      try {
        if (activePreviewResult?.id) {
          await requestKoreanPromptInBackground(activePreviewResult.id, previewPrompt);
          return;
        }

        const res = await fetch("/api/translate-korean", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ englishPrompt: previewPrompt }),
        });

        const data = (await res.json()) as { koreanPrompt?: string };
        if (typeof data.koreanPrompt === "string") {
          setKoreanPrompt(data.koreanPrompt);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsPreviewKoreanPromptLoading(false);
      }
    },
    [
      previewImageUrl,
      previewPrompt,
      previewKoreanPrompt,
      isPreviewKoreanPromptLoading,
      activePreviewResult,
      requestKoreanPromptInBackground,
    ],
  );

  const copyPreviewPrompt = useCallback(async () => {
    if (!activePreviewPrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(activePreviewPrompt);
      setIsPreviewPromptCopied(true);
    } catch {
      setIsPreviewPromptCopied(false);
    }
  }, [activePreviewPrompt]);

  const downloadPreviewImage = useCallback(() => {
    if (!previewImageUrl) return;
    const a = document.createElement("a");
    a.href = previewImageUrl;
    a.download = `brandgen-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsPreviewImageDownloaded(true);
  }, [previewImageUrl]);

  const analyzePreviewConsistency = useCallback(() => {
    if (!activePreviewResult?.id || !previewImageUrl) return;
    void requestConsistencyInBackground(activePreviewResult.id, previewImageUrl, previewPrompt);
  }, [activePreviewResult, previewImageUrl, previewPrompt, requestConsistencyInBackground]);

  const applyConsistencyAsReference = useCallback(
    (kind: "character" | "object" | "style") => {
      if (!previewImageUrl) return;
      const promptByKind = {
        character: activePreviewConsistency.character,
        object: activePreviewConsistency.object,
        style: activePreviewConsistency.style,
      };
      const nextPrompt = promptByKind[kind]?.trim();
      if (!nextPrompt) return;

      const entry = createReferenceEntryFromConsistency(kind, nextPrompt, previewImageUrl);
      if (kind === "character") {
        setCharacterReferences((prev) => [entry, ...prev]);
        setActiveCharacterReferenceId(entry.id);
        addOptionalNode("characterReference");
        return;
      }
      if (kind === "object") {
        setObjectReferences((prev) => [entry, ...prev]);
        setActiveObjectReferenceId(entry.id);
        addOptionalNode("objectReference");
        return;
      }

      setStyles((prev) => [entry, ...prev]);
      setActiveStyleId(entry.id);
    },
    [activePreviewConsistency, addOptionalNode, previewImageUrl],
  );

  const applyAllConsistency = useCallback(() => {
    applyConsistencyAsReference("character");
    applyConsistencyAsReference("object");
    applyConsistencyAsReference("style");
  }, [applyConsistencyAsReference]);

  if (viewMode === "gallery") {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-canvas)", color: "var(--text-primary)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8 }}>BrandGen</span>
              </div>
              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                style={{ width: 42, height: 24, borderRadius: 999, backgroundColor: theme === "dark" ? "var(--port-ratio)" : "var(--border-node)", position: "relative", cursor: "pointer", border: "none" }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "var(--bg-node-base)", position: "absolute", top: 3, left: theme === "dark" ? 21 : 3, transition: "left 0.2s" }} />
              </button>
            </div>

            <button
              onClick={startNewGeneration}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 18px",
                borderRadius: 16,
                border: "1px solid color-mix(in srgb, var(--port-prompt) 55%, var(--border-node))",
                backgroundColor: "color-mix(in srgb, var(--port-prompt) 14%, transparent)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              신규 생성
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.9 }}>라이브러리</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LayoutGrid size={14} color="var(--text-secondary)" />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{generatedResults.length}개의 결과</span>
            </div>
          </div>

          {generatedResults.length === 0 ? (
            <div style={{ padding: "72px 32px", borderRadius: 28, border: "1px dashed var(--border-node)", background: "linear-gradient(180deg, color-mix(in srgb, var(--bg-node-base) 80%, transparent), transparent)", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, margin: "0 auto 18px", borderRadius: 24, backgroundColor: "color-mix(in srgb, var(--port-style) 14%, transparent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={30} color="var(--port-style)" />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>아직 저장된 결과가 없습니다</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 22 }}>
                첫 번째 이미지를 만든 뒤, 여기서 다시 편집하고 복제하는 흐름으로 이어갈 수 있습니다.
              </div>
              <button
                onClick={startNewGeneration}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 20px",
                  borderRadius: 16,
                  border: "1px solid var(--border-node)",
                  backgroundColor: "var(--bg-node-base)",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <ImagePlus size={16} />
                이미지 생성
              </button>
            </div>
          ) : (
            <div className="gallery-masonry">
              {generatedResults.map((result) => (
                <button
                  type="button"
                  key={result.id}
                  onClick={() => openResultInEditor(result)}
                  className="gallery-card"
                  style={{
                    textAlign: "left",
                  }}
                >
                  <div className="gallery-card-media">
                    {result.imageUrl ? (
                      <Image
                        src={result.imageUrl}
                        alt={getDisplayTitle(result)}
                        width={900}
                        height={1200}
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        className="gallery-card-image"
                      />
                    ) : null}
                    <div className="gallery-card-overlay">
                      <div className="gallery-card-copy">
                        <div className="gallery-card-title">{getDisplayTitle(result)}</div>
                        <div
                          className="gallery-card-style"
                          style={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: 3,
                            overflow: "hidden",
                          }}
                        >
                          {getActiveStylePrompt(result) || "스타일 프롬프트 없음"}
                        </div>
                      </div>
                      <div className="gallery-card-footer">
                        <div className="gallery-card-date">
                          {new Date(result.createdAt).toLocaleString("ko-KR")}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main style={{ width: "100vw", height: "100vh", backgroundColor: "var(--bg-canvas)" }}>
      <ReactFlow
        nodes={finalNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: "default", animated: false, style: { strokeWidth: 3 } }}
        connectionLineStyle={{ stroke: "var(--text-tertiary)", strokeWidth: 3 }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        colorMode={theme}
      >
        <Background color="var(--border-node)" gap={24} size={1} />
      </ReactFlow>

      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 4, display: "flex", alignItems: "center", padding: "4px", backgroundColor: "var(--bg-node-base)", borderRadius: "20px", border: "1px solid var(--border-node)", boxShadow: "var(--shadow-node)" }}>
        <Controls
          showInteractive={false}
          position="top-right"
          style={{
            position: "relative",
            top: 0,
            right: 0,
            margin: 0,
            display: "flex",
            flexDirection: "row",
            backgroundColor: "transparent",
            border: "none",
            boxShadow: "none",
          }}
        />
      </div>

      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 4, display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", backgroundColor: "var(--bg-node-base)", borderRadius: "20px", border: "1px solid var(--border-node)", boxShadow: "var(--shadow-node)" }}>
        <button
          onClick={() => setViewMode("gallery")}
          style={{ width: 34, height: 34, borderRadius: 17, border: "1px solid var(--border-node)", backgroundColor: "var(--bg-canvas)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-primary)" }}
          title="결과 보드로 돌아가기"
        >
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text-primary)" }}>BrandGen</span>
        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "100px", backgroundColor: "var(--text-primary)", color: "var(--bg-canvas)", textTransform: "uppercase", letterSpacing: "0.8px" }}>베타</span>
        <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border-node)", margin: "0 4px" }} />
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: theme === "dark" ? "var(--port-ratio)" : "var(--border-node)", position: "relative", cursor: "pointer", transition: "background-color 0.2s", border: "none" }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "var(--bg-node-base)", position: "absolute", top: 2, left: theme === "dark" ? 18 : 2, transition: "left 0.2s" }} />
        </button>
      </div>

      <div style={{ position: "absolute", top: 88, left: 20, zIndex: 4, width: 320, padding: "12px", backgroundColor: "var(--bg-node-base)", borderRadius: "16px", border: "1px solid var(--border-node)", boxShadow: "var(--shadow-node)", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "color-mix(in srgb, var(--port-composition) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--port-composition)" }}>
              <Sparkles size={14} />
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>설정 노드 추가</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.45 }}>기본 노드는 고정, 세밀한 제어만 필요할 때 추가합니다.</div>
            </div>
          </div>
        </div>

        {(Object.keys(OPTIONAL_NODE_CONFIG) as OptionalNodeKey[]).map((key) => {
          const config = OPTIONAL_NODE_CONFIG[key];
          const isActive = activeOptionalNodes[key];
          return (
            <button
              key={key}
              type="button"
              className="nodrag"
              disabled={isActive}
              onClick={() => addOptionalNode(key)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "10px 12px",
                borderRadius: "12px",
                border: `1px solid ${isActive ? "var(--border-node)" : `color-mix(in srgb, ${config.color} 45%, var(--border-node))`}`,
                backgroundColor: isActive ? "var(--bg-canvas)" : `color-mix(in srgb, ${config.color} 10%, transparent)`,
                color: isActive ? "var(--text-muted)" : "var(--text-primary)",
                cursor: isActive ? "default" : "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", textAlign: "left" as const }}>
                <span style={{ fontSize: "12px", fontWeight: 700 }}>{config.label}</span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{config.description}</span>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isActive ? "transparent" : "var(--bg-node-base)", color: isActive ? "var(--text-muted)" : config.color, border: isActive ? "1px dashed var(--border-node)" : "none" }}>
                <Plus size={14} />
              </div>
            </button>
          );
        })}
      </div>

      {activeResult && (
        <div style={{ position: "absolute", top: 88, right: 20, zIndex: 4, width: 300, padding: "12px", backgroundColor: "var(--bg-node-base)", borderRadius: "16px", border: "1px solid var(--border-node)", boxShadow: "var(--shadow-node)", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{getDisplayTitle(activeResult)}</div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            기존 결과를 기반으로 편집 중입니다. 여기서 다시 Generate 하면 원본은 유지되고, 새 결과 카드가 갤러리에 자동으로 추가됩니다.
          </div>
        </div>
      )}

      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            backgroundColor: "rgba(9, 9, 11, 0.84)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(96vw, 1600px)",
              maxHeight: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              padding: "12px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "color-mix(in srgb, var(--bg-node-base) 92%, black 8%)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {previewTitle}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(null)}
                  style={{
                    height: "36px",
                    padding: "0 14px",
                    borderRadius: "999px",
                    border: "1px solid var(--border-node)",
                    backgroundColor: "var(--bg-node-base)",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "row", gap: "10px", minHeight: 0 }}>
              <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                <div
                  style={{
                    width: "100%",
                    height: "calc(100vh - 110px)",
                    minHeight: "70vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "18px",
                    overflow: "hidden",
                    backgroundColor: "rgba(0,0,0,0.22)",
                  }}
                >
                  <Image
                    src={previewImageUrl}
                    alt={previewTitle}
                    width={1800}
                    height={1800}
                    unoptimized
                    sizes="(max-width: 1200px) 100vw, 72vw"
                    style={{
                      width: "auto",
                      height: "auto",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              </div>
              <aside
                style={{
                  width: "min(360px, 28vw)",
                  minWidth: "280px",
                  maxHeight: "calc(100vh - 94px)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  borderRadius: "18px",
                  backgroundColor: "color-mix(in srgb, var(--bg-node-base) 88%, black 12%)",
                }}
              >
                <div
                  style={{
                    flex: "1 1 auto",
                    overflowY: "auto",
                    position: "relative",
                    padding: "54px 14px 14px",
                    borderRadius: "14px",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-node)",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    color: activePreviewPrompt.trim() ? "var(--text-primary)" : "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px",
                      borderRadius: "999px",
                      backgroundColor: "var(--bg-node-base)",
                      border: "1px solid var(--border-node)",
                    }}
                  >
                    {(["ko", "en"] as const).map((language) => {
                      const isActive = previewPromptLanguage === language;
                      return (
                        <button
                          key={language}
                          type="button"
                          onClick={() => {
                            void handlePreviewPromptLanguageChange(language);
                          }}
                          style={{
                            height: "28px",
                            padding: "0 12px",
                            borderRadius: "999px",
                            border: "none",
                            backgroundColor: isActive ? "var(--bg-canvas)" : "transparent",
                            color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {language === "ko" ? "한글" : "English"}
                        </button>
                      );
                    })}
                  </div>
                  {activePreviewPrompt.trim()
                    || (previewPromptLanguage === "ko"
                      ? (isPreviewKoreanPromptLoading ? "한글 프롬프트를 번역 중입니다." : "한글 프롬프트를 준비 중입니다.")
                      : "영문 프롬프트가 없습니다.")}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    padding: "12px",
                    borderRadius: "14px",
                    backgroundColor: "var(--bg-canvas)",
                    border: "1px solid var(--border-node)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-primary)" }}>일관성 앨리먼트</span>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: activePreviewResult?.consistencyStatus === "ready" ? "var(--port-prompt)" : "var(--text-muted)" }}>
                      {activePreviewResult?.consistencyStatus === "pending"
                        ? "분석 중"
                        : activePreviewResult?.consistencyStatus === "failed"
                          ? "분석 실패"
                          : activePreviewResult?.consistencyStatus === "ready"
                            ? "준비됨"
                            : "없음"}
                    </span>
                  </div>
                  {activePreviewResult?.consistencyStatus === "pending" ? (
                    <div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                      생성 이미지를 분석해 다음 생성에 재사용할 캐릭터, 오브젝트, 스타일 정보를 추출 중입니다.
                    </div>
                  ) : activePreviewResult?.consistency ? (
                    <>
                      {([
                        ["character", "캐릭터", activePreviewConsistency.character],
                        ["object", "오브젝트", activePreviewConsistency.object],
                        ["style", "스타일", activePreviewConsistency.style],
                        ["composition", "구도", activePreviewConsistency.composition],
                      ] as const).map((item) => {
                        const [key, label, value] = item;
                        if (!value.trim()) return null;
                        return (
                          <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
                            <span style={{ fontSize: "11px", lineHeight: 1.55, color: "var(--text-primary)" }}>{value}</span>
                          </div>
                        );
                      })}
                      {activePreviewConsistency.rules.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.4 }}>규칙</span>
                          <span style={{ fontSize: "11px", lineHeight: 1.55, color: "var(--text-primary)" }}>
                            {activePreviewConsistency.rules.join(" · ")}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <button type="button" onClick={() => applyConsistencyAsReference("character")} disabled={!activePreviewConsistency.character.trim()} style={{ height: 32, borderRadius: 999, border: "1px solid var(--border-node)", backgroundColor: "var(--bg-node-base)", color: activePreviewConsistency.character.trim() ? "var(--text-primary)" : "var(--text-muted)", fontSize: 11, fontWeight: 800, cursor: activePreviewConsistency.character.trim() ? "pointer" : "default" }}>캐릭터로 사용</button>
                        <button type="button" onClick={() => applyConsistencyAsReference("object")} disabled={!activePreviewConsistency.object.trim()} style={{ height: 32, borderRadius: 999, border: "1px solid var(--border-node)", backgroundColor: "var(--bg-node-base)", color: activePreviewConsistency.object.trim() ? "var(--text-primary)" : "var(--text-muted)", fontSize: 11, fontWeight: 800, cursor: activePreviewConsistency.object.trim() ? "pointer" : "default" }}>오브젝트로 사용</button>
                        <button type="button" onClick={() => applyConsistencyAsReference("style")} disabled={!activePreviewConsistency.style.trim()} style={{ height: 32, borderRadius: 999, border: "1px solid var(--border-node)", backgroundColor: "var(--bg-node-base)", color: activePreviewConsistency.style.trim() ? "var(--text-primary)" : "var(--text-muted)", fontSize: 11, fontWeight: 800, cursor: activePreviewConsistency.style.trim() ? "pointer" : "default" }}>스타일로 사용</button>
                        <button type="button" onClick={applyAllConsistency} style={{ height: 32, borderRadius: 999, border: "1px solid color-mix(in srgb, var(--port-prompt) 50%, var(--border-node))", backgroundColor: "color-mix(in srgb, var(--port-prompt) 12%, transparent)", color: "var(--text-primary)", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>전체 적용</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                        이 결과에는 아직 일관성 앨리먼트가 없습니다. 버튼을 눌러 기존 이미지에서도 앨리먼트를 생성할 수 있습니다.
                      </div>
                      <button
                        type="button"
                        onClick={analyzePreviewConsistency}
                        disabled={!canAnalyzePreviewConsistency}
                        style={{
                          height: 34,
                          borderRadius: 999,
                          border: "1px solid color-mix(in srgb, var(--port-prompt) 50%, var(--border-node))",
                          backgroundColor: canAnalyzePreviewConsistency ? "color-mix(in srgb, var(--port-prompt) 12%, transparent)" : "var(--bg-node-base)",
                          color: canAnalyzePreviewConsistency ? "var(--text-primary)" : "var(--text-muted)",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: canAnalyzePreviewConsistency ? "pointer" : "default",
                        }}
                      >
                        일관성 앨리먼트 생성
                      </button>
                    </>
                  )}
                  {activePreviewResult?.consistencyStatus === "failed" && (
                    <button
                      type="button"
                      onClick={analyzePreviewConsistency}
                      disabled={!canAnalyzePreviewConsistency}
                      style={{
                        height: 34,
                        borderRadius: 999,
                        border: "1px solid color-mix(in srgb, var(--port-prompt) 50%, var(--border-node))",
                        backgroundColor: "color-mix(in srgb, var(--port-prompt) 12%, transparent)",
                        color: "var(--text-primary)",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      다시 생성
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={downloadPreviewImage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      flex: 1,
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "999px",
                      border: "1px solid var(--border-node)",
                      backgroundColor: "var(--bg-node-base)",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {isPreviewImageDownloaded ? <Check size={14} /> : <Download size={14} />}
                    이미지 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={copyPreviewPrompt}
                    disabled={!activePreviewPrompt.trim()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      flex: 1,
                      height: "38px",
                      padding: "0 12px",
                      borderRadius: "999px",
                      border: "1px solid var(--border-node)",
                      backgroundColor: activePreviewPrompt.trim() ? "var(--bg-node-base)" : "var(--bg-canvas)",
                      color: activePreviewPrompt.trim() ? "var(--text-primary)" : "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: activePreviewPrompt.trim() ? "pointer" : "default",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {isPreviewPromptCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isPreviewPromptCopied ? "복사됨" : "프롬프트 복사"}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, MarkerType, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PromptNode } from '@/components/nodes/PromptNode';
import { StyleNode } from '@/components/nodes/StyleNode';
import { RatioNode } from '@/components/nodes/RatioNode';
import { ResolutionNode } from '@/components/nodes/ResolutionNode';
import { CompositionNode } from '@/components/nodes/CompositionNode';
import { BackgroundNode } from '@/components/nodes/BackgroundNode';
import { ConstraintNode } from '@/components/nodes/ConstraintNode';
import { MoodNode } from '@/components/nodes/MoodNode';
import { PaletteNode } from '@/components/nodes/PaletteNode';
import { CameraAngleNode } from '@/components/nodes/CameraAngleNode';
import { LightingNode } from '@/components/nodes/LightingNode';
import { GestureNode } from '@/components/nodes/GestureNode';
import { PropsNode } from '@/components/nodes/PropsNode';
import { DetailNode } from '@/components/nodes/DetailNode';
import { OutputNode } from '@/components/nodes/OutputNode';
import { CanvasNode } from '@/components/nodes/CanvasNode';
import { Plus, Sparkles } from 'lucide-react';

import type { StyleEntry } from '@/components/StyleAddModal';

const STORAGE_KEY = "brandgen_state"; // canonical key

const initialEdges = [
  { 
    id: 'e-prompt-output', 
    source: 'prompt-node', 
    sourceHandle: 'prompt-out',
    target: 'output-node', 
    targetHandle: 'general-in', 
    style: { stroke: 'var(--port-prompt)', strokeWidth: 3 },
  },
  { 
    id: 'e-style-output', 
    source: 'style-node', 
    sourceHandle: 'style-out',
    target: 'output-node', 
    targetHandle: 'general-in', 
    style: { stroke: 'var(--port-style)', strokeWidth: 3 },
  },
  { 
    id: 'e-ratio-output', 
    source: 'ratio-node', 
    sourceHandle: 'ratio-out',
    target: 'output-node', 
    targetHandle: 'general-in', 
    style: { stroke: 'var(--port-ratio)', strokeWidth: 3 },
  },
  { 
    id: 'e-resolution-output', 
    source: 'resolution-node', 
    sourceHandle: 'resolution-out',
    target: 'output-node', 
    targetHandle: 'general-in', 
    style: { stroke: 'var(--port-resolution)', strokeWidth: 3 },
  },
];

const OPTIONAL_NODE_CONFIG = {
  composition: {
    id: 'composition-node',
    type: 'compositionNode',
    label: '구도',
    description: '전신, 반신, 클로즈업, 원거리 같은 장면 구도를 제어합니다.',
    position: { x: 50, y: 850 },
    sourceHandle: 'composition-out',
    edgeId: 'e-composition-output',
    color: 'var(--port-composition)',
  },
  background: {
    id: 'background-node',
    type: 'backgroundNode',
    label: '배경',
    description: '배경 밀도와 환경 분위기를 제어합니다.',
    position: { x: 300, y: 850 },
    sourceHandle: 'background-out',
    edgeId: 'e-background-output',
    color: 'var(--port-background)',
  },
  constraints: {
    id: 'constraint-node',
    type: 'constraintNode',
    label: '제한사항',
    description: '텍스트, 로고, 인원 수 같은 금지 조건을 고정합니다.',
    position: { x: 550, y: 850 },
    sourceHandle: 'constraint-out',
    edgeId: 'e-constraint-output',
    color: 'var(--port-constraint)',
  },
  mood: {
    id: 'mood-node',
    type: 'moodNode',
    label: '무드',
    description: '장면의 감정 톤과 에너지 레벨을 제어합니다.',
    position: { x: 800, y: 850 },
    sourceHandle: 'mood-out',
    edgeId: 'e-mood-output',
    color: 'var(--port-mood)',
  },
  palette: {
    id: 'palette-node',
    type: 'paletteNode',
    label: '색상 팔레트',
    description: '색 사용 규칙과 톤 방향을 분리해서 제어합니다.',
    position: { x: 1050, y: 850 },
    sourceHandle: 'palette-out',
    edgeId: 'e-palette-output',
    color: 'var(--port-palette)',
  },
  cameraAngle: {
    id: 'camera-angle-node',
    type: 'cameraAngleNode',
    label: '카메라 앵글',
    description: '정면, 측면, 로우, 탑뷰 같은 시점 방향을 제어합니다.',
    position: { x: 1300, y: 850 },
    sourceHandle: 'camera-angle-out',
    edgeId: 'e-camera-angle-output',
    color: 'var(--port-camera-angle)',
  },
  lighting: {
    id: 'lighting-node',
    type: 'lightingNode',
    label: '조명',
    description: '장면의 빛 방향과 광질을 분리해서 제어합니다.',
    position: { x: 1550, y: 850 },
    sourceHandle: 'lighting-out',
    edgeId: 'e-lighting-output',
    color: 'var(--port-lighting)',
  },
  gesture: {
    id: 'gesture-node',
    type: 'gestureNode',
    label: '표정/제스처',
    description: '표정과 몸의 에너지, 동작감을 강화합니다.',
    position: { x: 1800, y: 850 },
    sourceHandle: 'gesture-out',
    edgeId: 'e-gesture-output',
    color: 'var(--port-gesture)',
  },
  props: {
    id: 'props-node',
    type: 'propsNode',
    label: '소품',
    description: '핵심 소품을 설명과 분리해서 안정적으로 고정합니다.',
    position: { x: 2050, y: 850 },
    sourceHandle: 'props-out',
    edgeId: 'e-props-output',
    color: 'var(--port-props)',
  },
  detail: {
    id: 'detail-node',
    type: 'detailNode',
    label: '출력 밀도',
    description: '얼마나 단순하거나 정교하게 그릴지 제어합니다.',
    position: { x: 2300, y: 850 },
    sourceHandle: 'detail-out',
    edgeId: 'e-detail-output',
    color: 'var(--port-detail)',
  },
} as const;

export default function Home() {
  return (
    <ReactFlowProvider>
      <FlowContent />
    </ReactFlowProvider>
  );
}

function FlowContent() {
  const [theme, setTheme] = useState<"light" | "dark">("dark"); // Default dark mode for pipeline UI
  const [prompt, setPrompt] = useState("");
  const [styles, setStyles] = useState<StyleEntry[]>([]);
  const [activeStyleId, setActiveStyleId] = useState<string | null>(null);
  const [ratio, setRatio] = useState("1:1");
  const [resolution, setResolution] = useState("HD");
  const [composition, setComposition] = useState("full-body composition with visible limbs and clear silhouette");
  const [backgroundPrompt, setBackgroundPrompt] = useState("pure white background with no environmental details");
  const [constraints, setConstraints] = useState("no text, letters, numbers, captions, or typography anywhere");
  const [mood, setMood] = useState("refined and premium mood with polished restraint");
  const [palette, setPalette] = useState("soft muted pastel palette with low saturation and gentle warmth");
  const [cameraAngle, setCameraAngle] = useState("front-facing camera angle with direct clear presentation");
  const [lighting, setLighting] = useState("soft diffused lighting with gentle even illumination");
  const [gesture, setGesture] = useState("hurried gesture with swinging arms and strong forward momentum");
  const [propsPrompt, setPropsPrompt] = useState("include a stack of documents or loose papers as the main prop");
  const [detailLevel, setDetailLevel] = useState("balanced detail level with readable features and restrained extras");
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [englishPrompt, setEnglishPrompt] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [nodes, setNodes] = useState<any[]>([
    {
      id: 'prompt-node',
      type: 'promptNode',
      position: { x: 50, y: 50 },
      data: { prompt: "", onChange: setPrompt },
    },
    {
      id: 'style-node',
      type: 'styleNode',
      position: { x: 50, y: 300 },
      data: { 
        styles: [], 
        activeStyleId: null,
        setStyles, 
        setActiveStyleId,
      },
    },
    {
      id: 'ratio-node',
      type: 'ratioNode',
      position: { x: 50, y: 550 },
      data: { ratio: "1:1", setRatio },
    },
    {
      id: 'resolution-node',
      type: 'resolutionNode',
      position: { x: 50, y: 700 },
      data: { resolution: "HD", setResolution },
    },
    {
      id: 'output-node',
      type: 'outputNode',
      position: { x: 450, y: 150 },
      data: { 
        prompt: "", style: null, ratio: "1:1", resolution: "HD", 
        englishPrompt: "", isTranslating: false, 
        onGenerate: () => {}, 
        canGenerate: false,
        isGenerating: false 
      },
    }
  ]);
  const [edges, setEdges] = useState<any[]>(initialEdges);

  // Load from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.lastImageUrl) setImageUrl(saved.lastImageUrl);
      if (saved.ratio) setRatio(saved.ratio);
      if (saved.resolution) setResolution(saved.resolution);
      if (saved.composition) setComposition(saved.composition);
      if (saved.backgroundPrompt) setBackgroundPrompt(saved.backgroundPrompt);
      if (saved.constraints) setConstraints(saved.constraints);
      if (saved.mood) setMood(saved.mood);
      if (saved.palette) setPalette(saved.palette);
      if (saved.cameraAngle) setCameraAngle(saved.cameraAngle);
      if (saved.lighting) setLighting(saved.lighting);
      if (saved.gesture) setGesture(saved.gesture);
      if (saved.propsPrompt) setPropsPrompt(saved.propsPrompt);
      if (saved.detailLevel) setDetailLevel(saved.detailLevel);
      if (saved.theme) setTheme(saved.theme);
    } catch { /* ignore */ }
  }, []);

  // Sync theme to document body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "{}";
      const saved = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, theme: newTheme }));
    } catch {}
  };

  // Translate prompt whenever inputs or connections change (debounced)
  useEffect(() => {
    const isPromptConnected = edges.some(e => e.target === 'output-node' && e.source === 'prompt-node');
    const isStyleConnected = edges.some(e => e.target === 'output-node' && e.source === 'style-node');
    const isRatioConnected = edges.some(e => e.target === 'output-node' && e.source === 'ratio-node');
    const isResConnected = edges.some(e => e.target === 'output-node' && e.source === 'resolution-node');
    const isCompositionConnected = edges.some(e => e.target === 'output-node' && e.source === 'composition-node');
    const isBackgroundConnected = edges.some(e => e.target === 'output-node' && e.source === 'background-node');
    const isConstraintConnected = edges.some(e => e.target === 'output-node' && e.source === 'constraint-node');
    const isMoodConnected = edges.some(e => e.target === 'output-node' && e.source === 'mood-node');
    const isPaletteConnected = edges.some(e => e.target === 'output-node' && e.source === 'palette-node');
    const isCameraAngleConnected = edges.some(e => e.target === 'output-node' && e.source === 'camera-angle-node');
    const isLightingConnected = edges.some(e => e.target === 'output-node' && e.source === 'lighting-node');
    const isGestureConnected = edges.some(e => e.target === 'output-node' && e.source === 'gesture-node');
    const isPropsConnected = edges.some(e => e.target === 'output-node' && e.source === 'props-node');
    const isDetailConnected = edges.some(e => e.target === 'output-node' && e.source === 'detail-node');

    if (!isPromptConnected && !isStyleConnected && !isRatioConnected && !isResConnected && !isCompositionConnected && !isBackgroundConnected && !isConstraintConnected && !isMoodConnected && !isPaletteConnected && !isCameraAngleConnected && !isLightingConnected && !isGestureConnected && !isPropsConnected && !isDetailConnected) {
      setEnglishPrompt("");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsTranslating(true);
      try {
        const activeStyle = styles.find(s => s.id === activeStyleId);  
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: isPromptConnected ? prompt : "", 
            style: isStyleConnected ? (activeStyle?.prompt || null) : null, 
            ratio: isRatioConnected ? ratio : null, 
            resolution: isResConnected ? resolution : null,
            composition: isCompositionConnected ? composition : null,
            background: isBackgroundConnected ? backgroundPrompt : null,
            constraints: isConstraintConnected ? constraints : null,
            mood: isMoodConnected ? mood : null,
            palette: isPaletteConnected ? palette : null,
            cameraAngle: isCameraAngleConnected ? cameraAngle : null,
            lighting: isLightingConnected ? lighting : null,
            gesture: isGestureConnected ? gesture : null,
            propsPrompt: isPropsConnected ? propsPrompt : null,
            detailLevel: isDetailConnected ? detailLevel : null,
          }),
          signal: controller.signal
        });
        const data = await res.json();
        if (data.englishPrompt) {
          setEnglishPrompt(data.englishPrompt);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error(e);
        }
      } finally {
        setIsTranslating(false);
      }
    }, 1000); // 1s debounce

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [prompt, activeStyleId, styles, ratio, resolution, composition, backgroundPrompt, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel, edges]);

  const handleGenerate = useCallback(async () => {
    const isPromptConnected = edges.some(e => e.target === 'output-node' && e.source === 'prompt-node');
    const isStyleConnected = edges.some(e => e.target === 'output-node' && e.source === 'style-node');
    const isCompositionConnected = edges.some(e => e.target === 'output-node' && e.source === 'composition-node');
    const isBackgroundConnected = edges.some(e => e.target === 'output-node' && e.source === 'background-node');
    const isConstraintConnected = edges.some(e => e.target === 'output-node' && e.source === 'constraint-node');
    const isMoodConnected = edges.some(e => e.target === 'output-node' && e.source === 'mood-node');
    const isPaletteConnected = edges.some(e => e.target === 'output-node' && e.source === 'palette-node');
    const isCameraAngleConnected = edges.some(e => e.target === 'output-node' && e.source === 'camera-angle-node');
    const isLightingConnected = edges.some(e => e.target === 'output-node' && e.source === 'lighting-node');
    const isGestureConnected = edges.some(e => e.target === 'output-node' && e.source === 'gesture-node');
    const isPropsConnected = edges.some(e => e.target === 'output-node' && e.source === 'props-node');
    const isDetailConnected = edges.some(e => e.target === 'output-node' && e.source === 'detail-node');

    const effectivePrompt = isPromptConnected ? prompt : "";
    const activeStyle = isStyleConnected ? styles.find(s => s.id === activeStyleId) : null;

    if ((!effectivePrompt.trim() && !activeStyle) || isGenerating) return;
    setIsGenerating(true);
    setError(false);
    
    // ... rest of the function using effectivePrompt and effectiveStyle ...
    // (I will keep the rest as is but use the variables)
    
    // Add Canvas Node dynamically if it doesn't exist
    setNodes(nds => {
      const hasCanvas = nds.some(n => n.id === 'canvas-node');
      if (!hasCanvas) {
        return [...nds, {
          id: 'canvas-node',
          type: 'canvasNode',
          position: { x: 850, y: 150 },
          data: { imageUrl: null, error: false, isGenerating: true },
        }];
      }
      return nds;
    });

    setEdges(eds => {
      const hasEdge = eds.some(e => e.id === 'e-prompt-canvas');
      if (!hasEdge) {
        return [...eds, {
          id: 'e-prompt-canvas',
          source: 'output-node',
          sourceHandle: 'output-out',
          target: 'canvas-node',
          targetHandle: 'canvas-in',
          style: { stroke: 'var(--text-primary)', strokeWidth: 3 },
          animated: true,
        }];
      }
      return eds;
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: effectivePrompt,
          style: activeStyle?.prompt || null,
          ratio,
          resolution,
          composition: isCompositionConnected ? composition : null,
          background: isBackgroundConnected ? backgroundPrompt : null,
          constraints: isConstraintConnected ? constraints : null,
          mood: isMoodConnected ? mood : null,
          palette: isPaletteConnected ? palette : null,
          cameraAngle: isCameraAngleConnected ? cameraAngle : null,
          lighting: isLightingConnected ? lighting : null,
          gesture: isGestureConnected ? gesture : null,
          propsPrompt: isPropsConnected ? propsPrompt : null,
          detailLevel: isDetailConnected ? detailLevel : null,
          // 이미 translate API에서 생성된 영문 프롬프트 재사용 → Gemini CLI 이중 호출 방지
          prebuiltPrompt: englishPrompt || null,
        }),
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
        // Save to local storage
        try {
          const raw = localStorage.getItem(STORAGE_KEY) || "{}";
          const saved = JSON.parse(raw);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            ...saved, 
            lastImageUrl: data.url,
            ratio,
            resolution,
            composition,
            backgroundPrompt,
            constraints,
            mood,
            palette,
            cameraAngle,
            lighting,
            gesture,
            propsPrompt,
            detailLevel
          }));
        } catch {}
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, activeStyleId, styles, ratio, resolution, composition, backgroundPrompt, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel, isGenerating, edges, englishPrompt]);

  const addOptionalNode = useCallback((key: keyof typeof OPTIONAL_NODE_CONFIG) => {
    const config = OPTIONAL_NODE_CONFIG[key];

    setNodes((nds) => {
      if (nds.some((node) => node.id === config.id)) return nds;
      return [
        ...nds,
        {
          id: config.id,
          type: config.type,
          position: config.position,
          data: {},
        },
      ];
    });

    setEdges((eds) => {
      if (eds.some((edge) => edge.id === config.edgeId)) return eds;
      return [
        ...eds,
        {
          id: config.edgeId,
          source: config.id,
          sourceHandle: config.sourceHandle,
          target: 'output-node',
          targetHandle: 'general-in',
          style: { stroke: config.color, strokeWidth: 3 },
        },
      ];
    });
  }, []);

  const removeOptionalNode = useCallback((key: keyof typeof OPTIONAL_NODE_CONFIG) => {
    const config = OPTIONAL_NODE_CONFIG[key];
    setNodes((nds) => nds.filter((node) => node.id !== config.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== config.id && edge.target !== config.id));
  }, []);

  const activeOptionalNodes = useMemo(() => ({
    composition: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.composition.id),
    background: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.background.id),
    constraints: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.constraints.id),
    mood: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.mood.id),
    palette: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.palette.id),
    cameraAngle: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.cameraAngle.id),
    lighting: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.lighting.id),
    gesture: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.gesture.id),
    props: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.props.id),
    detail: nodes.some((node) => node.id === OPTIONAL_NODE_CONFIG.detail.id),
  }), [nodes]);

  const nodeTypes = useMemo(() => ({
    promptNode: PromptNode,
    styleNode: StyleNode,
    ratioNode: RatioNode,
    resolutionNode: ResolutionNode,
    compositionNode: CompositionNode,
    backgroundNode: BackgroundNode,
    constraintNode: ConstraintNode,
    moodNode: MoodNode,
    paletteNode: PaletteNode,
    cameraAngleNode: CameraAngleNode,
    lightingNode: LightingNode,
    gestureNode: GestureNode,
    propsNode: PropsNode,
    detailNode: DetailNode,
    outputNode: OutputNode,
    canvasNode: CanvasNode,
  }), []);


  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: any) => {
    let targetHandle = params.targetHandle;
    
    // Always use general-in for the merged dot on OutputNode
    if (params.target === 'output-node') {
      targetHandle = 'general-in';
    }

    // Apply color styling based on source handle
    let style = { stroke: '#94a3b8', strokeWidth: 2 }; // Default
    if (params.sourceHandle === 'prompt-out') style = { stroke: 'var(--port-prompt)', strokeWidth: 3 };
    if (params.sourceHandle === 'style-out') style = { stroke: 'var(--port-style)', strokeWidth: 3 };
    if (params.sourceHandle === 'ratio-out') style = { stroke: 'var(--port-ratio)', strokeWidth: 3 };
    if (params.sourceHandle === 'resolution-out') style = { stroke: 'var(--port-resolution)', strokeWidth: 3 };
    if (params.sourceHandle === 'composition-out') style = { stroke: 'var(--port-composition)', strokeWidth: 3 };
    if (params.sourceHandle === 'background-out') style = { stroke: 'var(--port-background)', strokeWidth: 3 };
    if (params.sourceHandle === 'constraint-out') style = { stroke: 'var(--port-constraint)', strokeWidth: 3 };
    if (params.sourceHandle === 'mood-out') style = { stroke: 'var(--port-mood)', strokeWidth: 3 };
    if (params.sourceHandle === 'palette-out') style = { stroke: 'var(--port-palette)', strokeWidth: 3 };
    if (params.sourceHandle === 'camera-angle-out') style = { stroke: 'var(--port-camera-angle)', strokeWidth: 3 };
    if (params.sourceHandle === 'lighting-out') style = { stroke: 'var(--port-lighting)', strokeWidth: 3 };
    if (params.sourceHandle === 'gesture-out') style = { stroke: 'var(--port-gesture)', strokeWidth: 3 };
    if (params.sourceHandle === 'props-out') style = { stroke: 'var(--port-props)', strokeWidth: 3 };
    if (params.sourceHandle === 'detail-out') style = { stroke: 'var(--port-detail)', strokeWidth: 3 };

    setEdges((eds) => {
      // Remove any existing edge from the same source node to prevent duplicates
      const filtered = eds.filter(e => !(e.source === params.source && e.target === 'output-node'));
      return addEdge({ ...params, targetHandle, style }, filtered);
    });
  }, [setEdges]);

  const finalNodes = useMemo(() => {
    return nodes.map((node) => {
      const baseData = node.data || {};
      if (node.id === 'prompt-node') {
        return { ...node, data: { ...baseData, prompt, onChange: setPrompt } };
      }
      if (node.id === 'style-node') {
        return { ...node, data: { ...baseData, styles, activeStyleId, setStyles, setActiveStyleId } };
      }
      if (node.id === 'ratio-node') {
        return { ...node, data: { ...baseData, ratio, setRatio } };
      }
      if (node.id === 'resolution-node') {
        return { ...node, data: { ...baseData, resolution, setResolution } };
      }
      if (node.id === 'composition-node') {
        return {
          ...node,
          data: {
            ...baseData,
            composition,
            setComposition,
            onRemove: () => removeOptionalNode('composition'),
          },
        };
      }
      if (node.id === 'background-node') {
        return { ...node, data: { ...baseData, backgroundPrompt, setBackgroundPrompt, onRemove: () => removeOptionalNode('background') } };
      }
      if (node.id === 'constraint-node') {
        return { ...node, data: { ...baseData, constraints, setConstraints, onRemove: () => removeOptionalNode('constraints') } };
      }
      if (node.id === 'mood-node') {
        return { ...node, data: { ...baseData, mood, setMood, onRemove: () => removeOptionalNode('mood') } };
      }
      if (node.id === 'palette-node') {
        return { ...node, data: { ...baseData, palette, setPalette, onRemove: () => removeOptionalNode('palette') } };
      }
      if (node.id === 'camera-angle-node') {
        return { ...node, data: { ...baseData, cameraAngle, setCameraAngle, onRemove: () => removeOptionalNode('cameraAngle') } };
      }
      if (node.id === 'lighting-node') {
        return { ...node, data: { ...baseData, lighting, setLighting, onRemove: () => removeOptionalNode('lighting') } };
      }
      if (node.id === 'gesture-node') {
        return { ...node, data: { ...baseData, gesture, setGesture, onRemove: () => removeOptionalNode('gesture') } };
      }
      if (node.id === 'props-node') {
        return { ...node, data: { ...baseData, propsPrompt, setPropsPrompt, onRemove: () => removeOptionalNode('props') } };
      }
      if (node.id === 'detail-node') {
        return { ...node, data: { ...baseData, detailLevel, setDetailLevel, onRemove: () => removeOptionalNode('detail') } };
      }
      if (node.id === 'output-node') {
        const isPromptConnected = edges.some(e => e.target === 'output-node' && e.source === 'prompt-node');
        const isStyleConnected = edges.some(e => e.target === 'output-node' && e.source === 'style-node');
        return { 
          ...node, 
          data: { 
            ...baseData,
            prompt, 
            ratio, 
            resolution, 
            englishPrompt, isTranslating, 
            onGenerate: handleGenerate, 
            canGenerate: (isPromptConnected && !!prompt.trim()) || 
                         (isStyleConnected && !!activeStyleId),
            isGenerating 
          } 
        };
      }
      if (node.id === 'canvas-node') {
        return {
          ...node,
          data: { ...baseData, imageUrl, error, isGenerating }
        };
      }
      return node;
    });
  }, [nodes, prompt, activeStyleId, styles, ratio, resolution, composition, backgroundPrompt, constraints, mood, palette, cameraAngle, lighting, gesture, propsPrompt, detailLevel, englishPrompt, isTranslating, handleGenerate, isGenerating, imageUrl, error, edges, removeOptionalNode]);

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
      <ReactFlow
        nodes={finalNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: 'default', animated: false, style: { strokeWidth: 3 } }}
        connectionLineStyle={{ stroke: 'var(--text-tertiary)', strokeWidth: 3 }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        colorMode={theme}
      >
        <Background color="var(--border-node)" gap={24} size={1} />
      </ReactFlow>

      {/* 우상단 컨트롤 박스 (절대 위치로 간결하게 배치) */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 4, display: 'flex', alignItems: 'center', padding: '4px', backgroundColor: 'var(--bg-node-base)', borderRadius: '20px', border: '1px solid var(--border-node)', boxShadow: 'var(--shadow-node)' }}>
        <Controls 
          showInteractive={false} 
          position="top-right"
          style={{ 
            position: 'relative', 
            top: 0, 
            right: 0, 
            margin: 0,
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none'
          }} 
        />
      </div>

      {/* 좌상단 브랜드 박스 (기존 유지) */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 4, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-node-base)', borderRadius: '20px', border: '1px solid var(--border-node)', boxShadow: 'var(--shadow-node)' }}>
        <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>BrandGen</span>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '100px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-canvas)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>베타</span>
        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-node)', margin: '0 4px' }} />
        <div 
          onClick={toggleTheme}
          title="Toggle Theme"
          style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: theme === 'dark' ? 'var(--port-ratio)' : 'var(--border-node)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'var(--bg-node-base)', position: 'absolute', top: 2, left: theme === 'dark' ? 18 : 2, transition: 'left 0.2s' }} />
        </div>
      </div>

      <div style={{ position: 'absolute', top: 88, left: 20, zIndex: 4, width: 280, padding: '12px', backgroundColor: 'var(--bg-node-base)', borderRadius: '16px', border: '1px solid var(--border-node)', boxShadow: 'var(--shadow-node)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'color-mix(in srgb, var(--port-composition) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--port-composition)' }}>
            <Sparkles size={14} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>설정 노드 추가</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>기본 노드는 항상 보이고, 세밀한 제어는 필요할 때만 추가합니다.</div>
          </div>
        </div>

        <button
          type="button"
          className="nodrag"
          disabled={activeOptionalNodes.composition}
          onClick={() => addOptionalNode('composition')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '10px 12px',
            borderRadius: '12px',
            border: `1px solid ${activeOptionalNodes.composition ? 'var(--border-node)' : 'color-mix(in srgb, var(--port-composition) 45%, var(--border-node))'}`,
            backgroundColor: activeOptionalNodes.composition ? 'var(--bg-canvas)' : 'color-mix(in srgb, var(--port-composition) 10%, transparent)',
            color: activeOptionalNodes.composition ? 'var(--text-muted)' : 'var(--text-primary)',
            cursor: activeOptionalNodes.composition ? 'default' : 'pointer',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' as const }}>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>{OPTIONAL_NODE_CONFIG.composition.label}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{OPTIONAL_NODE_CONFIG.composition.description}</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: activeOptionalNodes.composition ? 'transparent' : 'var(--bg-node-base)', color: activeOptionalNodes.composition ? 'var(--text-muted)' : 'var(--port-composition)', border: activeOptionalNodes.composition ? '1px dashed var(--border-node)' : 'none' }}>
            <Plus size={14} />
          </div>
        </button>

        {(['background', 'constraints', 'mood', 'palette', 'cameraAngle', 'lighting', 'gesture', 'props', 'detail'] as const).map((key) => {
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: `1px solid ${isActive ? 'var(--border-node)' : `color-mix(in srgb, ${config.color} 45%, var(--border-node))`}`,
                backgroundColor: isActive ? 'var(--bg-canvas)' : `color-mix(in srgb, ${config.color} 10%, transparent)`,
                color: isActive ? 'var(--text-muted)' : 'var(--text-primary)',
                cursor: isActive ? 'default' : 'pointer',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', textAlign: 'left' as const }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{config.label}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{config.description}</span>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isActive ? 'transparent' : 'var(--bg-node-base)', color: isActive ? 'var(--text-muted)' : config.color, border: isActive ? '1px dashed var(--border-node)' : 'none' }}>
                <Plus size={14} />
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PromptNode } from '@/components/nodes/PromptNode';
import { StyleNode } from '@/components/nodes/StyleNode';
import { RatioNode } from '@/components/nodes/RatioNode';
import { ResolutionNode } from '@/components/nodes/ResolutionNode';
import { OutputNode } from '@/components/nodes/OutputNode';
import { CanvasNode } from '@/components/nodes/CanvasNode';

const STYLE_SAMPLES: { id: string; label: string; icon: string }[] = [];
const STORAGE_KEY = "brandgen_state"; // canonical key

const initialEdges = [
  { 
    id: 'e-prompt-output', 
    source: 'prompt-node', 
    sourceHandle: 'prompt-out',
    target: 'output-node', 
    targetHandle: 'prompt-in', 
    style: { stroke: 'var(--port-prompt)', strokeWidth: 3 },
  },
  { 
    id: 'e-style-output', 
    source: 'style-node', 
    sourceHandle: 'style-out',
    target: 'output-node', 
    targetHandle: 'style-in', 
    style: { stroke: 'var(--port-style)', strokeWidth: 3 },
  },
  { 
    id: 'e-ratio-output', 
    source: 'ratio-node', 
    sourceHandle: 'ratio-out',
    target: 'output-node', 
    targetHandle: 'ratio-in', 
    style: { stroke: 'var(--port-ratio)', strokeWidth: 3 },
  },
  { 
    id: 'e-resolution-output', 
    source: 'resolution-node', 
    sourceHandle: 'resolution-out',
    target: 'output-node', 
    targetHandle: 'resolution-in', 
    style: { stroke: 'var(--port-resolution)', strokeWidth: 3 },
  },
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark"); // Default dark mode for pipeline UI
  const [prompt, setPrompt] = useState("");
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [ratio, setRatio] = useState("1:1");
  const [resolution, setResolution] = useState("HD");
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [englishPrompt, setEnglishPrompt] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.customStyles) setCustomStyles(saved.customStyles);
      if (saved.lastImageUrl) setImageUrl(saved.lastImageUrl);
      if (saved.activeStyle) setActiveStyle(saved.activeStyle);
      if (saved.ratio) setRatio(saved.ratio);
      if (saved.resolution) setResolution(saved.resolution);
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

  // Translate prompt whenever inputs change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!prompt.trim() && !activeStyle) {
        setEnglishPrompt("");
        return;
      }
      setIsTranslating(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, style: activeStyle, ratio, resolution }),
        });
        const data = await res.json();
        if (data.englishPrompt) {
          setEnglishPrompt(data.englishPrompt);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsTranslating(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timeoutId);
  }, [prompt, activeStyle, ratio, resolution]);

  const handleGenerate = async () => {
    if ((!prompt.trim() && !activeStyle) || isGenerating) return;
    setIsGenerating(true);
    setError(false);
    
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
      const currentCustomStyle = activeStyle?.startsWith("custom-")
        ? customStyles[parseInt(activeStyle.split("-")[1])]
        : null;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: currentCustomStyle ? "custom" : activeStyle,
          customStyle: currentCustomStyle,
          ratio,
          resolution,
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
            resolution
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
  };

  const nodeTypes = useMemo(() => ({
    promptNode: PromptNode,
    styleNode: StyleNode,
    ratioNode: RatioNode,
    resolutionNode: ResolutionNode,
    outputNode: OutputNode,
    canvasNode: CanvasNode,
  }), []);

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>(initialEdges);

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: any) => {
    let targetHandle = params.targetHandle;
    
    // Map drops on the general node area to specific ports
    if (params.target === 'output-node' && targetHandle === 'general-in') {
      if (params.source === 'prompt-node') targetHandle = 'prompt-in';
      if (params.source === 'style-node') targetHandle = 'style-in';
      if (params.source === 'ratio-node') targetHandle = 'ratio-in';
      if (params.source === 'resolution-node') targetHandle = 'resolution-in';
    }

    // Apply color styling based on source node
    let style = {};
    if (params.source === 'prompt-node') style = { stroke: 'var(--port-prompt)', strokeWidth: 3 };
    if (params.source === 'style-node') style = { stroke: 'var(--port-style)', strokeWidth: 3 };
    if (params.source === 'ratio-node') style = { stroke: 'var(--port-ratio)', strokeWidth: 3 };
    if (params.source === 'resolution-node') style = { stroke: 'var(--port-resolution)', strokeWidth: 3 };

    setEdges((eds) => {
      // Remove any existing edge from the same source node to prevent duplicates
      const filtered = eds.filter(e => !(e.source === params.source && e.target === 'output-node'));
      return addEdge({ ...params, targetHandle, style }, filtered);
    });
  }, [setEdges]);

  // Update nodes data when state changes
  useEffect(() => {
    setNodes([
      {
        id: 'prompt-node',
        type: 'promptNode',
        position: { x: 50, y: 50 },
        data: { prompt, onChange: setPrompt },
      },
      {
        id: 'style-node',
        type: 'styleNode',
        position: { x: 50, y: 300 },
        data: { 
          activeStyle, 
          setActiveStyle, 
          customStyles, 
          setCustomStyles, 
          styleSamples: STYLE_SAMPLES 
        },
      },
      {
        id: 'ratio-node',
        type: 'ratioNode',
        position: { x: 50, y: 550 },
        data: { ratio, setRatio },
      },
      {
        id: 'resolution-node',
        type: 'resolutionNode',
        position: { x: 50, y: 700 },
        data: { resolution, setResolution },
      },
      {
        id: 'output-node',
        type: 'outputNode',
        position: { x: 450, y: 150 },
        data: { 
          prompt, style: activeStyle, ratio, resolution, 
          englishPrompt, isTranslating, 
          onGenerate: handleGenerate, 
          canGenerate: !!prompt.trim() || !!activeStyle,
          isGenerating 
        },
      }
    ]);
    
    // Update Canvas Node data if it exists
    setNodes(nds => nds.map(node => {
      if (node.id === 'canvas-node') {
        return {
          ...node,
          data: { ...node.data, imageUrl, error, isGenerating }
        };
      }
      return node;
    }));
  }, [prompt, activeStyle, customStyles, ratio, resolution, englishPrompt, isTranslating, isGenerating, imageUrl, error]);

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: 'default', animated: false, style: { strokeWidth: 2 } }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        colorMode={theme}
      >
        <Background color="var(--border-node)" gap={24} size={1} />
        <Controls position="bottom-center" orientation="horizontal" />
      </ReactFlow>

      {/* Header overlay */}
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
    </main>
  );
}

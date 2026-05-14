"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PromptNode } from '@/components/nodes/PromptNode';
import { StyleNode } from '@/components/nodes/StyleNode';
import { SettingsNode } from '@/components/nodes/SettingsNode';
import { GeneratorNode } from '@/components/nodes/GeneratorNode';
import { OutputNode } from '@/components/nodes/OutputNode';

const STYLE_SAMPLES: { id: string; label: string; icon: string }[] = [];
const STORAGE_KEY = "brandgen_state"; // canonical key

const initialEdges = [
  { id: 'e-prompt-gen', source: 'prompt-node', target: 'generator-node', targetHandle: 'prompt-in' },
  { id: 'e-style-gen', source: 'style-node', target: 'generator-node', targetHandle: 'style-in' },
  { id: 'e-settings-gen', source: 'settings-node', target: 'generator-node', targetHandle: 'settings-in' },
  { id: 'e-gen-output', source: 'generator-node', target: 'output-node' },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [activeStyle, setActiveStyle] = useState<string | null>(null);
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [ratio, setRatio] = useState("1:1");
  const [resolution, setResolution] = useState("HD");
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

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
    } catch { /* ignore */ }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(false);
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
    settingsNode: SettingsNode,
    generatorNode: GeneratorNode,
    outputNode: OutputNode,
  }), []);

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>(initialEdges);

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), []);

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
        id: 'settings-node',
        type: 'settingsNode',
        position: { x: 50, y: 600 },
        data: { ratio, setRatio, resolution, setResolution },
      },
      {
        id: 'generator-node',
        type: 'generatorNode',
        position: { x: 450, y: 150 },
        data: { 
          isGenerating, 
          canGenerate: prompt.trim().length > 0,
          onGenerate: handleGenerate 
        },
      },
      {
        id: 'output-node',
        type: 'outputNode',
        position: { x: 750, y: 100 },
        data: { imageUrl, error, isGenerating },
      }
    ]);
  }, [prompt, activeStyle, customStyles, ratio, resolution, isGenerating, imageUrl, error]);

  return (
    <main style={{ width: '100vw', height: '100vh', backgroundColor: 'var(--color-canvas-white)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: 'default', animated: false }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
      >
        <Background color="var(--color-faded-gray)" gap={24} />
        <Controls />
      </ReactFlow>
      
      {/* Header overlay */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 4, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--color-cloud-white)', borderRadius: '20px', border: '1px solid var(--color-faded-gray)', boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 12px' }}>
        <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--color-midnight-ink)' }}>BrandGen</span>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '100px', backgroundColor: 'var(--color-midnight-ink)', color: 'var(--color-cloud-white)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Node UI</span>
      </div>
    </main>
  );
}

import { Handle, Position, useEdges, useReactFlow } from '@xyflow/react';
import React, { useState } from 'react';
import { TextSelect, Play, X, Loader2 } from 'lucide-react';

const nodeStyle = {
  backgroundColor: 'color-mix(in srgb, var(--bg-node-base) 5%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: '12px',
  border: 'none',
  width: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  boxShadow: 'var(--shadow-node)',
};

const headerStyle = {
  backgroundColor: 'var(--bg-node-header)',
  padding: '8px 12px',
  borderBottom: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  borderTopLeftRadius: '12px',
  borderTopRightRadius: '12px',
};

const titleStyle = {
  fontSize: '12px',
  fontWeight: 600 as const,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const bodyStyle = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};



const promptTextAreaStyle = {
  width: '100%',
  backgroundColor: 'var(--bg-canvas)',
  borderRadius: '8px',
  border: '1px solid var(--border-node)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  lineHeight: '1.5',
  padding: '12px',
  resize: 'none' as const,
  outline: 'none',
  minHeight: '80px',
  fontFamily: 'monospace',
};

const labelStyle = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

export function OutputNode({ data, isConnectable }: any) {
  const { setEdges } = useReactFlow();
  const { prompt, style, ratio, resolution, englishPrompt, isTranslating, onGenerate, canGenerate, isGenerating } = data;

  const [hoverPrompt, setHoverPrompt] = useState(false);
  const [hoverStyle, setHoverStyle] = useState(false);
  const [hoverRatio, setHoverRatio] = useState(false);
  const [hoverRes, setHoverRes] = useState(false);

  const handleDisconnect = (handleId: string) => {
    setEdges((eds) => eds.filter(e => !(e.target === 'output-node' && e.targetHandle === handleId)));
  };

  const edges = useEdges();
  
  const isPromptConnected = edges.some(e => e.target === 'output-node' && e.targetHandle === 'prompt-in');
  const isStyleConnected = edges.some(e => e.target === 'output-node' && e.targetHandle === 'style-in');
  const isRatioConnected = edges.some(e => e.target === 'output-node' && e.targetHandle === 'ratio-in');
  const isResConnected = edges.some(e => e.target === 'output-node' && e.targetHandle === 'resolution-in');



  return (
    <div style={nodeStyle}>
      <Handle
        type="target"
        position={Position.Left}
        id="general-in"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          zIndex: -1,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output-out"
        isConnectable={false}
        style={{
          background: 'var(--text-primary)',
          border: 'none',
          width: '12px',
          height: '12px',
          right: '-6px',
          top: '50%',
        }}
      />
      <div style={headerStyle}>
        <TextSelect size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>프롬프트 조립</span>
      </div>

      <div style={bodyStyle}>
      {/* Left Edge Connection Dots */}
      <div style={{ position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 10 }}>
        {isPromptConnected && (
          <div
            style={{ width: '12px', height: '12px', cursor: 'pointer' }}
            onMouseEnter={() => setHoverPrompt(true)}
            onMouseLeave={() => setHoverPrompt(false)}
            onClick={() => handleDisconnect('prompt-in')}
            title="연결 해제"
          >
            <Handle
              type="target"
              position={Position.Left}
              id="prompt-in"
              isConnectable={1}
              style={{ background: hoverPrompt ? 'var(--bg-node-base)' : 'var(--port-prompt)', border: hoverPrompt ? '1px solid var(--port-prompt)' : 'none', width: '100%', height: '100%', position: 'relative', left: 'auto', top: 'auto', transform: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {hoverPrompt && <X size={8} color="var(--port-prompt)" strokeWidth={4} />}
            </Handle>
          </div>
        )}
        {isStyleConnected && (
          <div
            style={{ width: '12px', height: '12px', cursor: 'pointer' }}
            onMouseEnter={() => setHoverStyle(true)}
            onMouseLeave={() => setHoverStyle(false)}
            onClick={() => handleDisconnect('style-in')}
            title="연결 해제"
          >
            <Handle
              type="target"
              position={Position.Left}
              id="style-in"
              isConnectable={1}
              style={{ background: hoverStyle ? 'var(--bg-node-base)' : 'var(--port-style)', border: hoverStyle ? '1px solid var(--port-style)' : 'none', width: '100%', height: '100%', position: 'relative', left: 'auto', top: 'auto', transform: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {hoverStyle && <X size={8} color="var(--port-style)" strokeWidth={4} />}
            </Handle>
          </div>
        )}
        {isRatioConnected && (
          <div
            style={{ width: '12px', height: '12px', cursor: 'pointer' }}
            onMouseEnter={() => setHoverRatio(true)}
            onMouseLeave={() => setHoverRatio(false)}
            onClick={() => handleDisconnect('ratio-in')}
            title="연결 해제"
          >
            <Handle
              type="target"
              position={Position.Left}
              id="ratio-in"
              isConnectable={1}
              style={{ background: hoverRatio ? 'var(--bg-node-base)' : 'var(--port-ratio)', border: hoverRatio ? '1px solid var(--port-ratio)' : 'none', width: '100%', height: '100%', position: 'relative', left: 'auto', top: 'auto', transform: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {hoverRatio && <X size={8} color="var(--port-ratio)" strokeWidth={4} />}
            </Handle>
          </div>
        )}
        {isResConnected && (
          <div
            style={{ width: '12px', height: '12px', cursor: 'pointer' }}
            onMouseEnter={() => setHoverRes(true)}
            onMouseLeave={() => setHoverRes(false)}
            onClick={() => handleDisconnect('resolution-in')}
            title="연결 해제"
          >
            <Handle
              type="target"
              position={Position.Left}
              id="resolution-in"
              isConnectable={1}
              style={{ background: hoverRes ? 'var(--bg-node-base)' : 'var(--port-resolution)', border: hoverRes ? '1px solid var(--port-resolution)' : 'none', width: '100%', height: '100%', position: 'relative', left: 'auto', top: 'auto', transform: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
            >
              {hoverRes && <X size={8} color="var(--port-resolution)" strokeWidth={4} />}
            </Handle>
          </div>
        )}
      </div>

        {/* Assembled Prompt Display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={labelStyle}>
              <span>한글 요약</span>
            </div>
            <textarea
              readOnly
              style={promptTextAreaStyle}
              value={
                (prompt ? `[설명] ${prompt}\n` : '') +
                (style ? `[스타일] ${style}\n` : '') +
                (ratio ? `[비율] ${ratio}\n` : '') +
                (resolution ? `[해상도] ${resolution}\n` : '') || '입력된 데이터가 없습니다.'
              }
            />
          </div>

          <div>
            <div style={labelStyle}>
              <span>영문 변환 프롬프트 (Exaone 3.5)</span>
              {isTranslating && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
            </div>
            <textarea
              readOnly
              style={{ ...promptTextAreaStyle, minHeight: '100px', borderColor: englishPrompt ? 'var(--port-ratio)' : 'var(--border-node)' }}
              value={englishPrompt || (isTranslating ? '번역 중...' : '번역된 프롬프트 대기 중...')}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }} className="nodrag">
          <button
            onClick={onGenerate}
            disabled={!canGenerate || isGenerating}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: (!canGenerate || isGenerating) ? 'var(--bg-node-base)' : 'var(--text-primary)',
              color: (!canGenerate || isGenerating) ? 'var(--text-muted)' : 'var(--bg-node-base)',
              padding: '12px 16px',
              borderRadius: '100px',
              fontWeight: 600,
              fontSize: '14px',
              border: (!canGenerate || isGenerating) ? '1px solid var(--border-node)' : 'none',
              cursor: (!canGenerate || isGenerating) ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
            {isGenerating ? "생성 중..." : "이미지 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

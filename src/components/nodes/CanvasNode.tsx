import React, { useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { animate } from 'animejs';
import { Image as ImageIcon, Download } from 'lucide-react';

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

const canvasCardStyle = {
  backgroundColor: 'var(--bg-canvas)',
  borderRadius: '12px',
  border: '1px solid var(--border-node)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative' as const,
  width: '100%',
  aspectRatio: '1',
};

const imageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  transition: 'opacity 0.4s ease',
};

const placeholderStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  gap: '12px',
  userSelect: 'none' as const,
};

const placeholderIconStyle = {
  width: '56px',
  height: '56px',
  backgroundColor: 'var(--bg-node-base)',
  borderRadius: '16px',
  border: '1px solid var(--border-node)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  color: 'var(--text-muted)',
};

export function CanvasNode({ data }: any) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { imageUrl, isGenerating, error } = data;

  useEffect(() => {
    if (nodeRef.current) {
      // User requested animejs with cubic-bezier/inout easing
      animate(nodeRef.current, {
        opacity: [0, 1],
        scale: [0.8, 1],
        translateY: [20, 0],
        duration: 800,
        easing: 'inOutCubic',
      });
    }
  }, []);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `brandgen-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div ref={nodeRef} style={nodeStyle}>
      <Handle
        type="target"
        position={Position.Left}
        id="canvas-in"
        isConnectable={false}
        style={{
          background: 'var(--text-primary)',
          border: 'none',
          width: '12px',
          height: '12px',
          left: '-6px',
          top: '50%',
        }}
      />
      <div style={headerStyle}>
        <ImageIcon size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>캔버스</span>
      </div>

      <div style={bodyStyle}>
        <div style={canvasCardStyle}>
          {isGenerating && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-node-base)', opacity: 0.8, backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>생성 중…</span>
            </div>
          )}

          {error && !isGenerating && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-node-base)', opacity: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <span style={{ fontSize: '13px', color: '#ef4444' }}>생성 실패</span>
            </div>
          )}

          {imageUrl && !error ? (
            <img src={imageUrl} alt="Result" style={{ ...imageStyle, opacity: isGenerating ? 0.2 : 1 }} />
          ) : !isGenerating && !error ? (
            <div style={placeholderStyle}>
              <div style={placeholderIconStyle}>✦</div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.7' }}>
                결과물이<br />여기에 표시됩니다
              </p>
            </div>
          ) : null}
        </div>

        {imageUrl && !isGenerating && !error && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
            <button
              onClick={handleDownload}
              title="다운로드"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-node-base)',
                color: 'var(--text-primary)',
                width: '100%',
                height: '42px',
                borderRadius: '100px',
                border: '1px solid var(--border-node)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <Download size={18} /> 이미지 다운로드
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

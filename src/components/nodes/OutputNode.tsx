import { Handle, Position } from '@xyflow/react';
import React from 'react';

const nodeStyle = {
  backgroundColor: 'transparent',
  borderRadius: '20px',
  padding: '0',
  width: '320px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const canvasCardStyle = {
  backgroundColor: 'var(--color-whisper-gray)',
  borderRadius: '20px',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative' as const,
  width: '100%',
  aspectRatio: '1',
  boxShadow: 'rgb(228, 228, 231) 0px 1px 0px 0px inset',
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
  backgroundColor: 'var(--color-canvas-white)',
  borderRadius: '16px',
  border: '1px solid var(--color-faded-gray)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  color: 'var(--color-steel-gray)',
};

const btnDownloadStyle = (disabled: boolean) => ({
  backgroundColor: 'var(--color-cloud-white)',
  color: 'var(--color-graphite)',
  padding: '12px 16px',
  borderRadius: '8px',
  fontWeight: 500,
  fontSize: '14px',
  border: '1px solid var(--color-faded-gray)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.18s ease',
  textAlign: 'center' as const,
  opacity: disabled ? 0.4 : 1,
});

export function OutputNode({ data, isConnectable }: any) {
  const { imageUrl, error, isGenerating } = data;

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
    <div style={nodeStyle}>
      <Handle
        type="target"
        position={Position.Left}
        id="image-in"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-graphite)', width: '10px', height: '10px' }}
      />
      
      <div style={canvasCardStyle}>
        {isGenerating && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(236, 236, 238, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-graphite)' }}>생성 중…</span>
          </div>
        )}

        {error && !isGenerating && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(236, 236, 238, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <span style={{ fontSize: '13px', color: '#ef4444' }}>생성 실패</span>
          </div>
        )}

        {imageUrl && !error ? (
          <img src={imageUrl} alt="Result" style={{ ...imageStyle, opacity: isGenerating ? 0.2 : 1 }} />
        ) : !isGenerating && !error ? (
          <div style={placeholderStyle}>
            <div style={placeholderIconStyle}>✦</div>
            <p style={{ fontSize: '14px', color: 'var(--color-silver-mist)', textAlign: 'center', lineHeight: '1.7' }}>
              결과물이<br />여기에 표시됩니다
            </p>
          </div>
        ) : null}
      </div>

      <button
        style={btnDownloadStyle(!imageUrl || isGenerating)}
        disabled={!imageUrl || isGenerating}
        onClick={handleDownload}
        className="nodrag"
      >
        Download
      </button>
    </div>
  );
}

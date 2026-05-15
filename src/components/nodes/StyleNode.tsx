import { Handle, Position, useNodeConnections } from '@xyflow/react';
import React, { useRef } from 'react';
import { CircleCheck, Palette } from 'lucide-react';

const nodeStyle = {
  backgroundColor: 'color-mix(in srgb, var(--bg-node-base) 5%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: '12px',
  border: 'none',
  width: '280px',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
  boxShadow: 'var(--shadow-node)',
};

const headerStyle = {
  backgroundColor: 'var(--bg-node-header)',
  padding: '8px 12px',
  borderBottom: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
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

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
};

const itemStyle = (isActive: boolean) => ({
  aspectRatio: '1',
  backgroundColor: 'var(--bg-canvas)',
  border: isActive ? '2px solid var(--text-primary)' : '1.5px solid var(--border-node)',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative' as const,
  minWidth: 0,
});

const portLabelContainerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingTop: '8px',
  marginTop: '4px',
  borderTop: 'none',
};

const chipStyle = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'var(--bg-canvas)',
  padding: '4px 6px 4px 10px',
  borderRadius: '100px',
  border: '1px solid var(--border-node)',
  gap: '6px',
};

const portLabelStyle = {
  fontSize: '10px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.3px',
};

export function StyleNode({ data, isConnectable }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    activeStyle,
    setActiveStyle,
    customStyles = [],
    setCustomStyles,
    styleSamples = []
  } = data;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setCustomStyles((prev: string[]) => {
        const next = [...prev, b64];
        setActiveStyle(`custom-${next.length - 1}`);
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const connections = useNodeConnections({ handleType: 'source', handleId: 'style-out' });
  const isConnected = connections.length > 0;

  return (
    <div style={nodeStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div style={headerStyle}>
        <Palette size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>스타일 참조</span>
      </div>
      
      <div style={bodyStyle}>
        <div style={gridStyle} className="nodrag">
        {/* Built-in samples */}
        {styleSamples.map((s: any) => (
          <div
            key={s.id}
            style={itemStyle(activeStyle === s.id)}
            onClick={() => setActiveStyle(activeStyle === s.id ? null : s.id)}
          >
            <span style={{ fontSize: "1.3rem" }}>{s.icon}</span>
            {activeStyle === s.id && (
              <div style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'var(--bg-node-base)', borderRadius: '50%' }}>
                <CircleCheck fill="var(--text-primary)" stroke="var(--bg-node-base)" size={16} />
              </div>
            )}
          </div>
        ))}

        {/* Uploaded custom styles */}
        {customStyles.map((src: string, i: number) => {
          const styleId = `custom-${i}`;
          const isActive = activeStyle === styleId;
          return (
            <div
              key={styleId}
              style={itemStyle(isActive)}
              onClick={() => setActiveStyle(isActive ? null : styleId)}
            >
              <img src={src} alt={`Style ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {isActive && (
                <div style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'var(--bg-node-base)', borderRadius: '50%' }}>
                  <CircleCheck fill="var(--text-primary)" stroke="var(--bg-node-base)" size={16} />
                </div>
              )}
            </div>
          );
        })}

        {/* Upload button */}
        <div
          style={itemStyle(false)}
          onClick={() => fileInputRef.current?.click()}
          title="스타일 이미지 업로드"
        >
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>+ 추가</span>
        </div>
      </div>

        <div style={portLabelContainerStyle}>
          <div style={{ ...chipStyle, backgroundColor: isConnected ? 'color-mix(in srgb, var(--port-style) 15%, transparent)' : 'var(--bg-canvas)', borderColor: isConnected ? 'var(--port-style)' : 'var(--border-node)' }} className="nodrag">
            <span style={{ ...portLabelStyle, color: isConnected ? 'var(--port-style)' : 'var(--text-secondary)' }}>스타일 출력</span>
            <Handle
              type="source"
              position={Position.Right}
              id="style-out"
              isConnectable={1}
              style={{ background: 'var(--port-style)', width: '12px', height: '12px', border: `2px solid ${isConnected ? 'var(--bg-node-base)' : 'var(--bg-node-base)'}`, position: 'relative', right: 'auto', top: 'auto', transform: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

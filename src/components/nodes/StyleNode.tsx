import { Handle, Position } from '@xyflow/react';
import React, { useRef } from 'react';
import { CircleCheck } from 'lucide-react';

const nodeStyle = {
  backgroundColor: 'var(--color-cloud-white)',
  borderRadius: '20px',
  border: '1px solid var(--color-faded-gray)',
  padding: '16px',
  width: '260px',
  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 12px',
};

const titleStyle = {
  fontSize: '11px',
  fontWeight: 700 as const,
  color: 'var(--color-silver-mist)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.9px',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
};

const itemStyle = (isActive: boolean) => ({
  aspectRatio: '1',
  backgroundColor: 'var(--color-canvas-white)',
  border: isActive ? '2px solid var(--color-midnight-ink)' : '1.5px solid var(--color-faded-gray)',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  position: 'relative' as const,
  minWidth: 0,
});

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

  return (
    <div style={nodeStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div style={titleStyle}>
        <span style={{ fontSize: '14px' }}>✨</span> Style
      </div>
      
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
              <div style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: '50%' }}>
                <CircleCheck fill="var(--color-midnight-ink)" stroke="var(--color-cloud-white)" size={16} />
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
                <div style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: '50%' }}>
                  <CircleCheck fill="var(--color-midnight-ink)" stroke="var(--color-cloud-white)" size={16} />
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
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-steel-gray)' }}>+ Add</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="style-out"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-midnight-ink)', width: '10px', height: '10px' }}
      />
    </div>
  );
}

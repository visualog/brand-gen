import { Handle, Position, useNodeConnections } from '@xyflow/react';
import React from 'react';
import { Square, RectangleHorizontal, RectangleVertical, Ratio } from 'lucide-react';

const nodeStyle = {
  backgroundColor: 'color-mix(in srgb, var(--bg-node-base) 5%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: '12px',
  border: 'none',
  width: '180px',
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

const toolbarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: 'var(--bg-canvas)',
  borderRadius: '12px',
  padding: '4px',
  border: 'none',
};

const toolbarButtonStyle = (isActive: boolean) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: isActive ? 'var(--bg-node-base)' : 'transparent',
  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
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

export function RatioNode({ data, isConnectable }: any) {
  const { ratio, setRatio } = data;

  const connections = useNodeConnections({ handleType: 'source', handleId: 'ratio-out' });
  const isConnected = connections.length > 0;

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>
        <Ratio size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>화면 비율</span>
      </div>

      <div style={bodyStyle}>
        <div style={toolbarStyle} className="nodrag">
          <button style={toolbarButtonStyle(ratio === '1:1')} onClick={() => setRatio('1:1')} title="1:1 화면비"><Square size={16} /></button>
          <button style={toolbarButtonStyle(ratio === '16:9')} onClick={() => setRatio('16:9')} title="16:9 화면비"><RectangleHorizontal size={16} /></button>
          <button style={toolbarButtonStyle(ratio === '9:16')} onClick={() => setRatio('9:16')} title="9:16 화면비"><RectangleVertical size={16} /></button>
        </div>

        <div style={{ ...portLabelContainerStyle, marginTop: '8px' }}>
          <div style={{ ...chipStyle, backgroundColor: isConnected ? 'color-mix(in srgb, var(--port-ratio) 15%, transparent)' : 'var(--bg-canvas)', borderColor: isConnected ? 'var(--port-ratio)' : 'var(--border-node)' }} className="nodrag">
            <span style={{ ...portLabelStyle, color: isConnected ? 'var(--port-ratio)' : 'var(--text-secondary)' }}>비율 출력</span>
            <Handle
              type="source"
              position={Position.Right}
              id="ratio-out"
              isConnectable={1}
              style={{ background: 'var(--port-ratio)', width: '12px', height: '12px', border: `2px solid ${isConnected ? 'var(--bg-node-base)' : 'var(--bg-node-base)'}`, position: 'relative', right: 'auto', top: 'auto', transform: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

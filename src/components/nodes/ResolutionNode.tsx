import { Handle, Position, useNodeConnections } from '@xyflow/react';
import React from 'react';
import { Monitor } from 'lucide-react';

const nodeStyle = {
  backgroundColor: 'color-mix(in srgb, var(--bg-node-base) 5%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: '12px',
  border: 'none',
  width: '140px',
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

export function ResolutionNode({ data, isConnectable }: any) {
  const { resolution, setResolution } = data;

  const connections = useNodeConnections({ handleType: 'source', handleId: 'resolution-out' });
  const isConnected = connections.length > 0;

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>
        <Monitor size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>해상도</span>
      </div>

      <div style={bodyStyle}>
        <div style={toolbarStyle} className="nodrag">
          <button style={toolbarButtonStyle(resolution === 'SD')} onClick={() => setResolution('SD')} title="SD 해상도">
            <span style={{ fontSize: '10px', fontWeight: 700 }}>SD</span>
          </button>
          <button style={toolbarButtonStyle(resolution === 'HD')} onClick={() => setResolution('HD')} title="HD 해상도">
            <span style={{ fontSize: '10px', fontWeight: 700 }}>HD</span>
          </button>
        </div>

        <div style={{ ...portLabelContainerStyle, marginTop: '8px' }}>
          <div style={{ ...chipStyle, backgroundColor: isConnected ? 'color-mix(in srgb, var(--port-resolution) 15%, transparent)' : 'var(--bg-canvas)', borderColor: isConnected ? 'var(--port-resolution)' : 'var(--border-node)' }} className="nodrag">
            <span style={{ ...portLabelStyle, color: isConnected ? 'var(--port-resolution)' : 'var(--text-secondary)' }}>해상도 출력</span>
            <Handle
              type="source"
              position={Position.Right}
              id="resolution-out"
              isConnectable={1}
              style={{ background: 'var(--port-resolution)', width: '12px', height: '12px', border: `2px solid ${isConnected ? 'var(--bg-node-base)' : 'var(--bg-node-base)'}`, position: 'relative', right: 'auto', top: 'auto', transform: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

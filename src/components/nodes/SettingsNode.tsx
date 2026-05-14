import { Handle, Position } from '@xyflow/react';
import React from 'react';

const nodeStyle = {
  backgroundColor: 'var(--color-cloud-white)',
  borderRadius: '20px',
  border: '1px solid var(--color-faded-gray)',
  padding: '16px',
  minWidth: '220px',
  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 12px',
};

const titleStyle = {
  fontSize: '11px',
  fontWeight: 700 as const,
  color: 'var(--color-silver-mist)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.9px',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 600 as const,
  color: 'var(--color-graphite)',
  marginBottom: '6px',
  display: 'block',
};

const rowStyle = {
  display: 'flex',
  gap: '8px',
  marginBottom: '16px',
};

const buttonStyle = (isActive: boolean) => ({
  flex: 1,
  padding: '6px 0',
  borderRadius: '6px',
  border: isActive ? '1.5px solid var(--color-midnight-ink)' : '1px solid var(--color-faded-gray)',
  backgroundColor: isActive ? 'var(--color-cloud-white)' : 'var(--color-canvas-white)',
  color: isActive ? 'var(--color-midnight-ink)' : 'var(--color-steel-gray)',
  fontSize: '12px',
  fontWeight: isActive ? 600 : 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textAlign: 'center' as const,
});

export function SettingsNode({ data, isConnectable }: any) {
  const { ratio, setRatio, resolution, setResolution } = data;

  return (
    <div style={nodeStyle}>
      <div style={titleStyle}>
        <span style={{ fontSize: '14px' }}>📐</span> Settings
      </div>

      <span style={labelStyle}>Aspect Ratio</span>
      <div style={rowStyle} className="nodrag">
        <button style={buttonStyle(ratio === '1:1')} onClick={() => setRatio('1:1')}>1:1</button>
        <button style={buttonStyle(ratio === '16:9')} onClick={() => setRatio('16:9')}>16:9</button>
        <button style={buttonStyle(ratio === '9:16')} onClick={() => setRatio('9:16')}>9:16</button>
      </div>

      <span style={labelStyle}>Resolution</span>
      <div style={{ ...rowStyle, marginBottom: 0 }} className="nodrag">
        <button style={buttonStyle(resolution === 'SD')} onClick={() => setResolution('SD')}>SD</button>
        <button style={buttonStyle(resolution === 'HD')} onClick={() => setResolution('HD')}>HD</button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="settings-out"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-midnight-ink)', width: '10px', height: '10px' }}
      />
    </div>
  );
}

import { Handle, Position } from '@xyflow/react';
import React from 'react';

const nodeStyle = {
  backgroundColor: 'var(--color-cloud-white)',
  borderRadius: '20px',
  border: '1px solid var(--color-faded-gray)',
  padding: '16px',
  minWidth: '200px',
  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 12px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const titleStyle = {
  fontSize: '11px',
  fontWeight: 700 as const,
  color: 'var(--color-silver-mist)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.9px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const btnGenerateStyle = (disabled: boolean) => ({
  backgroundColor: disabled ? 'var(--color-faded-gray)' : 'var(--color-midnight-ink)',
  color: disabled ? 'var(--color-silver-mist)' : 'var(--color-cloud-white)',
  padding: '12px 16px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.18s ease',
  boxShadow: disabled ? 'none' : 'rgba(255, 255, 255, 0.12) 0px 0.5px 0px inset, rgba(0, 0, 0, 0.2) 0px 2px 6px',
});

export function GeneratorNode({ data, isConnectable }: any) {
  const { isGenerating, onGenerate, canGenerate } = data;

  return (
    <div style={nodeStyle}>
      {/* Input Handle for Prompt */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt-in"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-graphite)', width: '10px', height: '10px', top: '30%' }}
      />
      {/* Input Handle for Style */}
      <Handle
        type="target"
        position={Position.Left}
        id="style-in"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-graphite)', width: '10px', height: '10px', top: '50%' }}
      />
      {/* Input Handle for Settings */}
      <Handle
        type="target"
        position={Position.Left}
        id="settings-in"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-graphite)', width: '10px', height: '10px', top: '70%' }}
      />
      
      <div style={titleStyle}>
        <span style={{ fontSize: '14px' }}>⚙️</span> Generator
      </div>

      <button
        style={btnGenerateStyle(!canGenerate || isGenerating)}
        disabled={!canGenerate || isGenerating}
        onClick={onGenerate}
        className="nodrag"
      >
        {isGenerating ? "Generating…" : "Generate"}
      </button>

      {/* Output Handle for Image */}
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-midnight-ink)', width: '10px', height: '10px' }}
      />
    </div>
  );
}

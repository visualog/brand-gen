import { Handle, Position } from '@xyflow/react';
import React, { useCallback } from 'react';

const nodeStyle = {
  backgroundColor: 'var(--color-cloud-white)',
  borderRadius: '20px',
  border: '1px solid var(--color-faded-gray)',
  padding: '16px',
  minWidth: '280px',
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

const textareaStyle = {
  width: '100%',
  minHeight: '80px',
  backgroundColor: 'transparent',
  border: 'none',
  padding: '0',
  color: 'var(--color-midnight-ink)',
  fontFamily: 'var(--font-sans)',
  fontSize: '14px',
  lineHeight: '1.65',
  resize: 'none' as const,
  outline: 'none',
};

export function PromptNode({ data, isConnectable }: any) {
  const onChange = useCallback((evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    data.onChange(evt.target.value);
  }, [data]);

  return (
    <div style={nodeStyle}>
      <div style={titleStyle}>
        <span style={{ fontSize: '14px' }}>📝</span> Prompt
      </div>
      <textarea
        style={textareaStyle}
        value={data.prompt || ''}
        onChange={onChange}
        placeholder="예: 자전거를 타고 달리는 사람…"
        className="nodrag"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-out"
        isConnectable={isConnectable}
        style={{ background: 'var(--color-midnight-ink)', width: '10px', height: '10px' }}
      />
    </div>
  );
}

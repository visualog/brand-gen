import { Handle, Position, useNodeConnections } from '@xyflow/react';
import React, { useCallback } from 'react';
import { MessageSquareText } from 'lucide-react';

const nodeStyle = {
  backgroundColor: 'color-mix(in srgb, var(--bg-node-base) 5%, transparent)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: '12px',
  border: 'none',
  width: '320px',
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

const textareaStyle = {
  width: '100%',
  minHeight: '120px',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--bg-canvas)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  resize: 'vertical' as const,
  outline: 'none',
  lineHeight: '1.5',
};

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

export function PromptNode({ data, isConnectable }: any) {
  const onChange = useCallback((value: string) => {
    data.onChange(value);
  }, [data]);

  const connections = useNodeConnections({ handleType: 'source', handleId: 'prompt-out' });
  const isConnected = connections.length > 0;

  return (
    <div style={nodeStyle}>
      <div style={headerStyle}>
        <MessageSquareText size={16} color="var(--text-secondary)" />
        <span style={titleStyle}>설명</span>
      </div>
      
      <div style={bodyStyle}>
        <textarea
          style={textareaStyle}
          value={data.prompt || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="예: 자전거를 타고 달리는 사람..."
          className="nodrag"
        />

        <div style={portLabelContainerStyle}>
          <div style={{ ...chipStyle, backgroundColor: isConnected ? 'color-mix(in srgb, var(--port-prompt) 15%, transparent)' : 'var(--bg-canvas)', borderColor: isConnected ? 'var(--port-prompt)' : 'var(--border-node)' }} className="nodrag">
            <span style={{ ...portLabelStyle, color: isConnected ? 'var(--port-prompt)' : 'var(--text-secondary)' }}>프롬프트 출력</span>
            <Handle
              type="source"
              position={Position.Right}
              id="prompt-out"
              isConnectable={1}
              style={{ background: 'var(--port-prompt)', width: '12px', height: '12px', border: `2px solid ${isConnected ? 'var(--bg-node-base)' : 'var(--bg-node-base)'}`, position: 'relative', right: 'auto', top: 'auto', transform: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

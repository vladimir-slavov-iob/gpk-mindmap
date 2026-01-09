import React, { memo } from 'react'
import { Handle, Position } from 'reactflow'
import './CustomNode.css'

function CustomNode({ data }) {
  const { label, title, isSelected, isHighlighted } = data

  return (
    <div className={`custom-node ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <strong>{label}</strong>
      </div>
      {title && (
        <div className="node-title">
          {title.substring(0, 40)}{title.length > 40 ? '...' : ''}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(CustomNode)

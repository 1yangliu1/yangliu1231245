import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

export function TextNode({ data, id }: NodeProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-200 w-[480px] flex flex-col font-sans relative group">
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <div className="p-2 border-b border-neutral-100 bg-neutral-50 rounded-t-xl text-xs font-medium text-neutral-600 text-center drag-handle cursor-move">
        {(data.title as string) || '文本段落'}
      </div>
      <div className="p-3">
        <textarea
          className="w-full min-h-[120px] max-h-[400px] border border-neutral-200 rounded-md p-2 text-xs focus:border-purple-500 outline-none text-neutral-800"
          value={data.content as string}
          onChange={(e) => data.onChange && (data.onChange as any)(id, e.target.value)}
        />
      </div>
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
    </div>
  );
}

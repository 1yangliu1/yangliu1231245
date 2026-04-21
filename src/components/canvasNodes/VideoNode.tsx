import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Video, Loader2 } from 'lucide-react';

export function VideoNode({ data, id }: NodeProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-200 flex flex-row font-sans relative group w-[480px]">
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      
      {/* Left Side: Text Area */}
      <div className="flex-1 flex flex-col border-r border-neutral-100">
        <div className="p-2 border-b border-neutral-100 bg-neutral-50 rounded-tl-xl text-xs font-medium text-neutral-600 text-center drag-handle cursor-move">
          {(data.title as string) || '文本分段'}
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <textarea
            className="w-full h-full min-h-[160px] resize-y border border-neutral-200 rounded-md p-2 text-xs focus:border-purple-500 outline-none text-neutral-800"
            value={data.content as string}
            onChange={(e) => data.onChange && (data.onChange as any)(id, { content: e.target.value })}
            placeholder="输入分段文本..."
          />
        </div>
      </div>

      {/* Right Side: Video Gen */}
      <div className="w-[240px] flex flex-col">
        <div className="p-2 border-b border-neutral-100 bg-neutral-50 rounded-tr-xl text-xs font-medium text-neutral-600 text-center drag-handle cursor-move">
          视频生成 (待定)
        </div>
        <div className="p-3 flex flex-col gap-2 flex-1">
          <div className="w-full flex-1 min-h-[140px] bg-neutral-100 rounded-md border border-neutral-200 border-dashed flex flex-col items-center justify-center text-neutral-400 text-xs gap-1.5 opacity-60">
            <Video className="w-6 h-6" />
            <span>视频功能待定</span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
    </div>
  );
}

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Image as ImageIcon, Video, FileText, Loader2, Upload, BoxSelect, Monitor, ChevronUp } from 'lucide-react';
import { IMAGE_MODELS } from '../../constants';
import { cn } from '../../lib/utils';

export function MainScriptNode({ data, id }: NodeProps) {
  const hasScript = !!(data.script as string)?.trim();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-neutral-200 w-[500px] flex flex-col font-sans relative">
      <Handle type="source" position={Position.Bottom} id="extract" style={{ left: '25%' }} className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="prompt" style={{ left: '75%' }} className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <div className="p-3 border-b border-neutral-100 flex items-center drag-handle bg-neutral-50 rounded-t-xl cursor-move relative">
        <div className="absolute left-4 text-[11px] font-semibold text-neutral-400 select-none">
          剧本对话框
        </div>
        <input 
          className="text-center font-bold text-lg bg-transparent border-none outline-none text-neutral-900 w-full placeholder:text-neutral-300 pointer-events-auto"
          value={data.title as string}
          onChange={(e) => data.onChange && (data.onChange as any)(id, { title: e.target.value })}
          placeholder="项目标题"
        />
      </div>
      <div className="p-4 flex flex-col gap-4 relative">
        <textarea 
          className="w-full h-[200px] resize-none border border-neutral-200 rounded-lg p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-neutral-800"
          value={data.script as string}
          onChange={(e) => data.onChange && (data.onChange as any)(id, { script: e.target.value })}
          placeholder="在此输入剧本内容..."
        />
        <div className="flex gap-3">
          <button 
            disabled={(data.isExtracting as boolean) || !hasScript}
            onClick={() => data.onExtract && (data.onExtract as any)(id)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2",
              hasScript && !(data.isExtracting as boolean) 
                ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md transform hover:scale-[1.02]" 
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            )}
          >
            {(data.isExtracting as boolean) ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            提取素材
          </button>
          <button 
            disabled={(data.isGeneratingPrompt as boolean) || !hasScript}
            onClick={() => data.onGeneratePrompt && (data.onGeneratePrompt as any)(id)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2",
              hasScript && !(data.isGeneratingPrompt as boolean)
                ? "bg-purple-500 text-white hover:bg-purple-600 shadow-md transform hover:scale-[1.02]"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            )}
          >
            {(data.isGeneratingPrompt as boolean) ? <Loader2 className="w-4 h-4 animate-spin" /> : <BoxSelect className="w-4 h-4" />}
            生成提示词
          </button>
        </div>
      </div>
    </div>
  );
}

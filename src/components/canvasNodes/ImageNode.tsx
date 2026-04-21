import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ImageIcon, Monitor, BoxSelect, Loader2, Upload, BookmarkPlus } from 'lucide-react';
import { IMAGE_MODELS } from '../../constants';
import { cn } from '../../lib/utils';

export function ImageNode({ data, id }: NodeProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentModel = IMAGE_MODELS.find(m => m.id === data.modelId) || IMAGE_MODELS[0];

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && data.onUpload) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        (data.onUpload as any)(id, ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onUpload) {
      (data.onUpload as any)(id, null);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.imageSrc) {
      const a = document.createElement('a');
      a.href = data.imageSrc as string;
      a.download = `image-${id}.png`;
      a.click();
    }
  };

  const handleImageDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.imageSrc) {
      setIsFullscreen(true);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md border border-neutral-200 w-[480px] flex flex-row font-sans relative group">
        <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
        <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
        
        {/* Left side: Text Area */}
        <div className="flex-1 flex flex-col border-r border-neutral-100">
          <div className="p-2 border-b border-neutral-100 bg-neutral-50 rounded-tl-xl text-xs font-medium text-neutral-600 text-center drag-handle cursor-move">
            {(data.title as string) || '文本分段'}
          </div>
          <div className="p-3 flex-1 flex flex-col">
            <textarea
              className="w-full h-full min-h-[220px] max-h-[500px] resize-y border border-neutral-200 rounded-md p-2 text-xs focus:border-purple-500 outline-none text-neutral-800"
              value={data.content as string}
              onChange={(e) => data.onChange && (data.onChange as any)(id, { content: e.target.value })}
              placeholder="输入分段文本..."
              onDoubleClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        {/* Right side: Image settings */}
        <div className="w-[240px] flex flex-col">
          <div className="p-2 border-b border-neutral-100 bg-neutral-50 rounded-tr-xl text-xs font-medium text-neutral-600 text-center drag-handle cursor-move flex justify-between px-3">
            <span>图片生成</span>
          </div>
          
          <div className="p-3 flex flex-col gap-2">
            <div 
              className="w-full h-[140px] bg-neutral-100 rounded-md border border-neutral-200 border-dashed flex items-center justify-center overflow-hidden relative group/img cursor-pointer"
              onDoubleClick={handleImageDoubleClick}
            >
              {data.imageSrc ? (
                <>
                  <img src={data.imageSrc as string} alt="generated" className="w-full h-full object-contain bg-black/5" referrerPolicy="no-referrer" />
                  
                  {/* Clear Button */}
                  <button 
                    onClick={handleClearImage}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-md flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity z-10 border-none cursor-pointer"
                  >
                    ×
                  </button>

                  {/* Save to Assets Button */}
                  {data.onSaveAsset && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        (data.onSaveAsset as any)(data.imageSrc as string, 'image');
                      }}
                      className="absolute bottom-1 right-8 bg-black/60 hover:bg-black/80 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity z-10 flex items-center gap-1 border-none cursor-pointer h-6"
                    >
                      <BookmarkPlus className="w-3 h-3" /> 存入资产
                    </button>
                  )}

                  {/* Download Button */}
                  <button 
                    onClick={handleDownload}
                    className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 hover:bg-neutral-800 text-white rounded-md flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity z-10 border-none cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>

                  {/* Overlay for replacing */}
                  <label className="absolute inset-x-0 inset-y-0 bottom-8 bg-black/40 flex items-center justify-center text-white text-xs font-medium cursor-pointer transition-opacity opacity-0 group-hover/img:opacity-100">
                    <Upload className="w-4 h-4 mr-1.5" /> 替换图片
                    <input type="file" accept="image/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={handleUpload} />
                  </label>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-200/50 transition-colors">
                  <div className="text-neutral-400 text-xs flex flex-col items-center gap-1.5 opacity-60">
                    <Upload className="w-6 h-6" />
                    <span>点击上传图片</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} onClick={(e) => e.stopPropagation()} />
                </label>
              )}
            </div>

          <div className="flex flex-col gap-2 mt-1">
            <div className="relative border border-neutral-200 rounded-md bg-white">
              <button 
                onClick={() => setModelOpen(!modelOpen)}
                className="w-full text-left px-2 py-1.5 text-xs text-neutral-700 flex justify-between items-center bg-transparent border-none cursor-pointer"
              >
                <span className="truncate">{currentModel.name}</span>
              </button>
              {modelOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 overflow-hidden">
                  {IMAGE_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { (data.onChange as any)(id, { modelId: m.id }); setModelOpen(false); }}
                      className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-neutral-50 border-none bg-transparent cursor-pointer"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 border border-neutral-200 rounded-md bg-white">
                <button 
                  onClick={() => setRatioOpen(!ratioOpen)}
                  className="w-full text-left px-2 py-1.5 text-[11px] text-neutral-700 flex items-center gap-1 bg-transparent border-none cursor-pointer"
                >
                  <BoxSelect className="w-3 h-3" />
                  {data.ratio as string}
                </button>
                {ratioOpen && (
                  <div className="absolute bottom-full left-0 w-[80px] mb-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 overflow-hidden">
                    {['1:1', '16:9', '9:16', '4:3', '3:4'].map(r => (
                      <button
                        key={r}
                        onClick={() => { (data.onChange as any)(id, { ratio: r }); setRatioOpen(false); }}
                        className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-neutral-50 border-none bg-transparent cursor-pointer"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative flex-1 border border-neutral-200 rounded-md bg-white">
                <button 
                  onClick={() => setResOpen(!resOpen)}
                  className="w-full text-left px-2 py-1.5 text-[11px] text-neutral-700 flex items-center gap-1 bg-transparent border-none cursor-pointer"
                >
                  <Monitor className="w-3 h-3" />
                  {data.resolution as string}
                </button>
                {resOpen && (
                  <div className="absolute bottom-full left-0 w-[80px] mb-1 bg-white border border-neutral-200 rounded-md shadow-lg z-50 overflow-hidden">
                    {['720p', '1080p', '2k', '4k'].map(r => (
                      <button
                        key={r}
                        onClick={() => { (data.onChange as any)(id, { resolution: r }); setResOpen(false); }}
                        className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-neutral-50 border-none bg-transparent cursor-pointer"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              disabled={data.isGenerating as boolean}
              onClick={() => data.onGenerate && (data.onGenerate as any)(id)}
              className="mt-1 w-full py-2 bg-yellow-500 text-white rounded-md text-[13px] font-medium hover:bg-yellow-600 transition disabled:opacity-50 flex items-center justify-center gap-1.5 border-none cursor-pointer"
            >
              {(data.isGenerating as boolean) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              {data.imageSrc ? '重新生成图片' : '生成图片'}
            </button>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 bg-neutral-300 border-2 border-white" />
      
      {(modelOpen || ratioOpen || resOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setModelOpen(false); setRatioOpen(false); setResOpen(false); }} />
      )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && data.imageSrc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsFullscreen(false)}
        >
          <img 
            src={data.imageSrc as string} 
            alt="Fullscreen" 
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md" 
            referrerPolicy="no-referrer"
          />
          <button 
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors border-none cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

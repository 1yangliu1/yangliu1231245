import { ArrowUp, Square, ChevronUp, Image as ImageIcon, Monitor } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface InputAreaProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  isImage?: boolean;
  currentImageRatio?: string;
  setCurrentImageRatio?: (val: string) => void;
  currentImageResolution?: string;
  setCurrentImageResolution?: (val: string) => void;
}

export function InputArea({ 
  input, 
  setInput, 
  onSend, 
  onStop, 
  isGenerating, 
  isImage,
  currentImageRatio,
  setCurrentImageRatio,
  currentImageResolution,
  setCurrentImageResolution
}: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [resOpen, setResOpen] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-6 pb-6 shrink-0">
      <div className="max-w-[780px] mx-auto relative">
        <div className={cn("flex items-end border border-neutral-200 rounded-2xl bg-white transition-all shadow-sm focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/5", isImage ? "p-2" : "")}>
          {isImage && (
            <div className="flex gap-2 items-center mr-2 relative self-end mb-[2px]">
              {/* Resolution Dropup */}
              <div className="relative">
                <button
                  onClick={() => { setResOpen(!resOpen); setRatioOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 border-none bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  {currentImageResolution}
                  <ChevronUp className="w-3 h-3 opacity-50" />
                </button>
                {resOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setResOpen(false)} />
                    <div className="absolute bottom-full mb-2 left-0 w-32 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                      {['720p', '1080p', '2k', '4k'].map(res => (
                        <button
                          key={res}
                          onClick={() => { setCurrentImageResolution?.(res); setResOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2 border-none text-xs cursor-pointer transition-colors hover:bg-neutral-50 flex items-center justify-between",
                            currentImageResolution === res ? "text-neutral-900 font-medium bg-neutral-50/50" : "text-neutral-500"
                          )}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Aspect Ratio Dropup */}
              <div className="relative">
                <button
                  onClick={() => { setRatioOpen(!ratioOpen); setResOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 border-none bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-medium text-neutral-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {currentImageRatio}
                  <ChevronUp className="w-3 h-3 opacity-50" />
                </button>
                {ratioOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setRatioOpen(false)} />
                    <div className="absolute bottom-full mb-2 left-0 w-28 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                      {['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'].map(ratio => (
                        <button
                          key={ratio}
                          onClick={() => { setCurrentImageRatio?.(ratio); setRatioOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2 border-none text-xs cursor-pointer transition-colors hover:bg-neutral-50 flex items-center justify-between",
                            currentImageRatio === ratio ? "text-neutral-900 font-medium bg-neutral-50/50" : "text-neutral-500"
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={isImage ? "输入图片描述词 (如: 一只可爱的猫咪，超现实主义，8k分辨率...)" : "输入消息..."}
            className={cn("flex-1 border-none outline-none text-sm resize-none bg-transparent text-neutral-900 max-h-[140px] leading-relaxed placeholder:text-neutral-400", isImage ? "py-2.5 px-2" : "py-3.5 px-4")}
          />
          {isGenerating ? (
            <button
              onClick={onStop}
              className={cn("border-none bg-red-500 text-white rounded-lg cursor-pointer flex items-center justify-center transition-all hover:bg-red-600 shrink-0", isImage ? "w-9 h-9 m-0" : "m-2 w-9 h-9")}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim()}
              className={cn("border-none bg-neutral-900 text-white rounded-lg cursor-pointer flex items-center justify-center transition-all hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed shrink-0", isImage ? "w-9 h-9 m-0" : "m-2 w-9 h-9")}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center text-[11px] text-neutral-400 mt-2">
          Enter 发送 · Shift+Enter 换行
        </div>
      </div>
    </div>
  );
}

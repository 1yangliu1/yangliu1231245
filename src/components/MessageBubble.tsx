import { Brain, Copy, RefreshCw, User, BookmarkPlus } from 'lucide-react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Message } from '../types';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  isLast?: boolean;
  isGenerating?: boolean;
  onSaveAsset?: (url: string, type: 'image' | 'audio') => void;
}

export function MessageBubble({ message, onRegenerate, isLast, isGenerating, onSaveAsset }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(() => isLast);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isThinkingActive = isLast && isGenerating && !message.content;

  return (
    <div className={cn("flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 group", isUser ? "flex-row-reverse user" : "flex-row assistant")}>
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center text-[13px] shrink-0 mt-0.5",
        isUser ? "bg-[#95ec69] text-green-900 border border-green-600/20" : "bg-neutral-100 text-neutral-900"
      )}>
        {isUser ? <User className="w-4 h-4" /> : "✦"}
      </div>
      
      <div className={cn("flex-1 min-w-0 flex flex-col", isUser ? "items-end" : "items-start")}>
        <div className="text-xs font-semibold text-neutral-500 mb-1">
          {isUser ? "你" : "繁星AI"}
        </div>
        
        {message.thinking && (
          <details 
            className="bg-neutral-50 border-l-2 border-blue-500 rounded-r-md px-3.5 py-2.5 mb-2.5 text-[13px] text-neutral-500 leading-relaxed group/thinking w-full text-left"
            open={isOpen}
            onToggle={(e) => setIsOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer font-semibold text-neutral-500 text-xs select-none hover:text-neutral-900 flex items-center gap-1.5">
              <Brain className={cn("w-3.5 h-3.5", isThinkingActive ? "animate-pulse text-blue-500" : "")} /> 
              {isThinkingActive ? "正在深度思考..." : "思考过程"}
            </summary>
            <div className="mt-2 whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto scrollbar-thin">
              {message.thinking}
            </div>
          </details>
        )}
        
        {(message.content || isThinkingActive) && (
          <div className={cn(
            "text-sm leading-relaxed text-neutral-900 break-words",
            isUser ? "bg-[#95ec69] px-4 py-3 rounded-xl rounded-tr-sm inline-block max-w-[85%] text-left" : "py-1 w-full"
          )}>
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              message.content ? (
                <div className="prose prose-sm prose-neutral max-w-none prose-pre:bg-neutral-50 prose-pre:border prose-pre:border-neutral-100 prose-pre:text-neutral-900 prose-img:rounded-xl">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    urlTransform={(value: string) => {
                      if (value.startsWith('data:image/')) return value;
                      return defaultUrlTransform(value);
                    }}
                    components={{
                      img: ({node, ...props}) => (
                        <div className="relative group/img inline-block w-full max-w-lg mb-4">
                          <img {...props} className="w-full rounded-xl m-0 block" />
                          {onSaveAsset && props.src && (
                            <button 
                              onClick={() => {
                                const type = props.src?.startsWith('data:audio/') ? 'audio' : 'image';
                                onSaveAsset(props.src!, type);
                              }}
                              className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-[10px] sm:text-xs px-2 py-1 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer border-none"
                            >
                              <BookmarkPlus className="w-3.5 h-3.5" /> 存入资产
                            </button>
                          )}
                        </div>
                      )
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex gap-1 py-2">
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" />
                </div>
              )
            )}
          </div>
        )}
        
        {message.content && (
          <div className={cn("flex gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity", isUser ? "justify-end" : "justify-start")}>
            <button
              onClick={handleCopy}
              className="px-2 py-1 border-none bg-transparent rounded cursor-pointer text-[11px] text-neutral-400 transition-all flex items-center gap-1 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Copy className="w-3 h-3" /> {copied ? "已复制" : "复制"}
            </button>
            {!isUser && isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-2 py-1 border-none bg-transparent rounded cursor-pointer text-[11px] text-neutral-400 transition-all flex items-center gap-1 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <RefreshCw className="w-3 h-3" /> 重新生成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { loadState, saveState, loadAssets, saveAssets } from './lib/storage';
import { Conversation, FuncType, Message, Asset } from './types';
import { callGeminiStreamAPI, callGeminiAPI } from './lib/api';
import { cn } from './lib/utils';
import { MODELS, IMAGE_MODELS } from './constants';

import { CanvasDramaArea } from './components/CanvasDramaArea';
import { AssetsArea } from './components/AssetsArea';

export default function App() {
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentFunc, setCurrentFunc] = useState<FuncType>('chat');
  const [currentDramaSubFunc, setCurrentDramaSubFunc] = useState<string>('1.优化剧本');
  const [currentSeedanceSubFunc, setCurrentSeedanceSubFunc] = useState<string>('互动剧提示词');
  const [currentImageRatio, setCurrentImageRatio] = useState<string>('16:9');
  const [currentImageResolution, setCurrentImageResolution] = useState<string>('1080p');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentModelId, setCurrentModelId] = useState('gemini-3.1-pro');
  const [currentModelName, setCurrentModelName] = useState('Gemini 3.1 Pro');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<{ msg: string; isError: boolean } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      const dbAssets = await loadAssets();
      setAssets(dbAssets);
      
      const state = loadState();
      setConversations(state.conversations);
      setCurrentFunc(state.currentFunc);
      
      // We will validate later dynamically based on func
      if (state.currentFunc === 'yellowImage') {
        const validImageModels = IMAGE_MODELS.map(m => m.id);
        if (validImageModels.includes(state.currentModelId)) {
          setCurrentModelId(state.currentModelId);
          setCurrentModelName(state.currentModelName);
        } else {
          setCurrentModelId('gemini-3-pro-image-preview');
          setCurrentModelName('nanobananapro');
        }
      } else {
        const validModels = MODELS.map(m => m.id);
        if (validModels.includes(state.currentModelId)) {
          setCurrentModelId(state.currentModelId);
          setCurrentModelName(state.currentModelName);
        } else {
          setCurrentModelId('gemini-3.1-pro');
          setCurrentModelName('Gemini 3.1 Pro');
        }
      }
      
      setCurrentConvId(state.currentConvId);
      setApiKey(state.apiKey || '');
      setIsInitialized(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      saveAssets(assets);
    }
  }, [assets, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      saveState(conversations, currentFunc, currentConvId, currentModelId, currentModelName, apiKey);
    }
  }, [conversations, currentFunc, currentConvId, currentModelId, currentModelName, apiKey, isInitialized]);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 2500);
  };

  const generateId = () => 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  const ensureConversation = (firstMsg: string) => {
    if (!currentConvId) {
      const id = generateId();
      let title = firstMsg.slice(0, 30).replace(/\\n/g, ' ');
      if (firstMsg.length > 30) title += '...';
      
      setConversations((prev) => ({
        ...prev,
        [id]: {
          id,
          func: currentFunc,
          dramaSubFunc: currentFunc === 'drama' ? currentDramaSubFunc : undefined,
          seedanceSubFunc: currentFunc === 'seedance' ? currentSeedanceSubFunc : undefined,
          title,
          messages: [],
          created: Date.now(),
        },
      }));
      setCurrentConvId(id);
      return id;
    }
    return currentConvId;
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isGenerating) return;

    const convId = ensureConversation(text);
    setInput('');
    
    setConversations((prev) => {
      const conv = prev[convId];
      return {
        ...prev,
        [convId]: {
          ...conv,
          messages: [...conv.messages, { role: 'user', content: text }],
        },
      };
    });

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      let currentMessages = [...(conversations[convId]?.messages || []), { role: 'user', content: text } as Message];
      
      // Pass proportion info for image generation
      if (currentFunc === 'yellowImage') {
        const lastMsg = currentMessages[currentMessages.length - 1];
        lastMsg.content = `【要求：比例 ${currentImageRatio}，分辨率 ${currentImageResolution}】 ${lastMsg.content}`;
      }

      let responseText = '';
      let thinkingText = '';

      try {
        const cConv = conversations[convId];
        const subFunc = cConv?.dramaSubFunc || cConv?.seedanceSubFunc || (currentFunc === 'drama' ? currentDramaSubFunc : currentFunc === 'seedance' ? currentSeedanceSubFunc : undefined);
        
        if (currentFunc === 'yellowImage') {
          // YellowImage models typically return a single image response and do NOT support streaming properly
          const result = await callGeminiAPI(
            currentMessages,
            currentFunc,
            currentModelId,
            apiKey,
            subFunc,
            abortControllerRef.current.signal
          );
          setConversations((prev) => {
            const conv = prev[convId];
            const msgs = [...conv.messages];
            if (msgs[msgs.length - 1].role === 'assistant') {
              msgs[msgs.length - 1] = { role: 'assistant', content: result.text, thinking: result.thinking };
            } else {
              msgs.push({ role: 'assistant', content: result.text, thinking: result.thinking });
            }
            return { ...prev, [convId]: { ...conv, messages: msgs } };
          });
        } else {
          await callGeminiStreamAPI(
            currentMessages,
            currentFunc,
            currentModelId,
            apiKey,
            subFunc,
            (chunk) => {
              responseText = chunk;
              setConversations((prev) => {
                const conv = prev[convId];
                const msgs = [...conv.messages];
                if (msgs[msgs.length - 1].role === 'assistant') {
                  msgs[msgs.length - 1].content = chunk;
                } else {
                  msgs.push({ role: 'assistant', content: chunk, thinking: thinkingText });
                }
                return { ...prev, [convId]: { ...conv, messages: msgs } };
              });
            },
            (thinking) => {
              thinkingText = thinking;
              setConversations((prev) => {
                const conv = prev[convId];
                const msgs = [...conv.messages];
                if (msgs[msgs.length - 1].role === 'assistant') {
                  msgs[msgs.length - 1].thinking = thinking;
                } else {
                  msgs.push({ role: 'assistant', content: '', thinking });
                }
                return { ...prev, [convId]: { ...conv, messages: msgs } };
              });
            },
            abortControllerRef.current.signal
          );
        }
      } catch (streamErr: any) {
        if (streamErr.name === 'AbortError') throw streamErr;
        console.warn('Stream failed, trying non-stream fallback:', streamErr.message);
        
        const cConv = conversations[convId];
        const subFunc = cConv?.dramaSubFunc || cConv?.seedanceSubFunc || (currentFunc === 'drama' ? currentDramaSubFunc : currentFunc === 'seedance' ? currentSeedanceSubFunc : undefined);
        const result = await callGeminiAPI(
          currentMessages,
          currentFunc,
          currentModelId,
          apiKey,
          subFunc,
          abortControllerRef.current.signal
        );
        
        setConversations((prev) => {
          const conv = prev[convId];
          const msgs = [...conv.messages];
          if (msgs[msgs.length - 1].role === 'assistant') {
            msgs[msgs.length - 1] = { role: 'assistant', content: result.text, thinking: result.thinking };
          } else {
            msgs.push({ role: 'assistant', content: result.text, thinking: result.thinking });
          }
          return { ...prev, [convId]: { ...conv, messages: msgs } };
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast('已停止生成');
      } else {
        const errMsg = `⚠️ 生成失败：${err.message}\n\n请检查网络连接或稍后重试。`;
        setConversations((prev) => {
          const conv = prev[convId];
          const msgs = [...conv.messages];
          if (msgs[msgs.length - 1].role === 'assistant') {
            msgs[msgs.length - 1].content = errMsg;
          } else {
            msgs.push({ role: 'assistant', content: errMsg });
          }
          return { ...prev, [convId]: { ...conv, messages: msgs } };
        });
        showToast('生成失败，请重试', true);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRegenerate = async () => {
    if (!currentConvId || isGenerating) return;
    
    const conv = conversations[currentConvId];
    if (conv.messages.length < 2) return;

    // Remove last assistant message
    setConversations((prev) => {
      const c = prev[currentConvId];
      return {
        ...prev,
        [currentConvId]: {
          ...c,
          messages: c.messages.slice(0, -1),
        },
      };
    });

    // We need to wait for state update before sending, or just pass the sliced messages
    const currentMessages = conv.messages.slice(0, -1);
    
    // Process image ratio if needed on regenerate
    if (currentFunc === 'yellowImage' && currentMessages.length > 0) {
      const lastMsg = currentMessages[currentMessages.length - 1];
      if (!lastMsg.content.includes('【要求：比例')) {
        lastMsg.content = `【要求：比例 ${currentImageRatio}，分辨率 ${currentImageResolution}】 ${lastMsg.content}`;
      } else {
        // Update ratio if it already has one
        lastMsg.content = lastMsg.content.replace(/【要求：比例 .*?】/, `【要求：比例 ${currentImageRatio}，分辨率 ${currentImageResolution}】`);
      }
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      let responseText = '';
      let thinkingText = '';

      try {
        const subFunc = conv.dramaSubFunc || conv.seedanceSubFunc || (currentFunc === 'drama' ? currentDramaSubFunc : currentFunc === 'seedance' ? currentSeedanceSubFunc : undefined);
        
        if (currentFunc === 'yellowImage') {
          const result = await callGeminiAPI(
            currentMessages,
            currentFunc,
            currentModelId,
            apiKey,
            subFunc,
            abortControllerRef.current.signal
          );
          setConversations((prev) => {
            const c = prev[currentConvId];
            const msgs = [...c.messages];
            if (msgs[msgs.length - 1].role === 'assistant') {
              msgs[msgs.length - 1] = { role: 'assistant', content: result.text, thinking: result.thinking };
            } else {
              msgs.push({ role: 'assistant', content: result.text, thinking: result.thinking });
            }
            return { ...prev, [currentConvId]: { ...c, messages: msgs } };
          });
        } else {
          await callGeminiStreamAPI(
            currentMessages,
            currentFunc,
            currentModelId,
            apiKey,
            subFunc,
            (chunk) => {
              responseText = chunk;
              setConversations((prev) => {
                const c = prev[currentConvId];
                const msgs = [...c.messages];
                if (msgs[msgs.length - 1].role === 'assistant') {
                  msgs[msgs.length - 1].content = chunk;
                } else {
                  msgs.push({ role: 'assistant', content: chunk, thinking: thinkingText });
                }
                return { ...prev, [currentConvId]: { ...c, messages: msgs } };
              });
            },
            (thinking) => {
              thinkingText = thinking;
              setConversations((prev) => {
                const c = prev[currentConvId];
                const msgs = [...c.messages];
                if (msgs[msgs.length - 1].role === 'assistant') {
                  msgs[msgs.length - 1].thinking = thinking;
                } else {
                  msgs.push({ role: 'assistant', content: '', thinking });
                }
                return { ...prev, [currentConvId]: { ...c, messages: msgs } };
              });
            },
            abortControllerRef.current.signal
          );
        }
      } catch (streamErr: any) {
        if (streamErr.name === 'AbortError') throw streamErr;
        
        const subFunc = conv.dramaSubFunc || conv.seedanceSubFunc || (currentFunc === 'drama' ? currentDramaSubFunc : currentFunc === 'seedance' ? currentSeedanceSubFunc : undefined);
        const result = await callGeminiAPI(
          currentMessages,
          currentFunc,
          currentModelId,
          apiKey,
          subFunc,
          abortControllerRef.current.signal
        );
        
        setConversations((prev) => {
          const c = prev[currentConvId];
          const msgs = [...c.messages];
          if (msgs[msgs.length - 1].role === 'assistant') {
            msgs[msgs.length - 1] = { role: 'assistant', content: result.text, thinking: result.thinking };
          } else {
            msgs.push({ role: 'assistant', content: result.text, thinking: result.thinking });
          }
          return { ...prev, [currentConvId]: { ...c, messages: msgs } };
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showToast('重新生成失败', true);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => {
      const newConvs = { ...prev };
      delete newConvs[id];
      return newConvs;
    });
    if (currentConvId === id) {
      setCurrentConvId(null);
    }
  };

  const createNewChat = () => {
    setCurrentConvId(null);
    setSidebarOpen(false);
  };

  const handleFuncChange = (func: FuncType) => {
    if (func === currentFunc && !currentConvId) return;
    setCurrentFunc(func);
    setCurrentConvId(null);
    setSidebarOpen(false);
    
    // Switch to appropriate model list based on function
    if (func === 'yellowImage') {
      setCurrentModelId('gemini-3-pro-image-preview');
      setCurrentModelName('nanobananapro');
    } else {
      const isImageModel = currentModelId === 'gemini-3-pro-image-preview' || currentModelId === 'gemini-3.1-flash-image-preview';
      if (isImageModel) {
        setCurrentModelId('gemini-3.1-pro');
        setCurrentModelName('Gemini 3.1 Pro');
      }
    }
  };

  const handleUpdateCanvas = (nodes: any[], edges: any[], title: string) => {
    if (!currentConvId) {
      const id = generateId();
      setConversations((prev) => ({
        ...prev,
        [id]: {
          id,
          func: 'canvasDrama',
          title: '新的短剧Agent',
          messages: [],
          created: Date.now(),
          nodes,
          edges,
        },
      }));
      setCurrentConvId(id);
    } else {
      setConversations((prev) => {
        const conv = prev[currentConvId];
        if (!conv) return prev;
        return { ...prev, [currentConvId]: { ...conv, nodes, edges } };
      });
    }
  };

  const handleSaveAsset = (url: string, type: 'image' | 'audio') => {
    setAssets(prev => [{
      id: `asset-${Date.now()}`,
      type,
      url,
      name: `${type}-${new Date().toLocaleTimeString()}.png`, // simplify name
      createdAt: Date.now()
    }, ...prev]);
    showToast('已存入资产库');
  };

  if (!isInitialized) return null;

  const currentMessages = currentConvId ? conversations[currentConvId]?.messages || [] : [];

  return (
    <div className="flex h-screen w-full max-w-[1600px] mx-auto bg-neutral-50 text-neutral-900 font-sans overflow-hidden">
      <Sidebar
        currentFunc={currentFunc}
        setCurrentFunc={handleFuncChange}
        conversations={conversations}
        currentConvId={currentConvId}
        setCurrentConvId={setCurrentConvId}
        deleteConversation={deleteConversation}
        createNewChat={createNewChat}
        currentModelId={currentModelId}
        setCurrentModelId={setCurrentModelId}
        currentModelName={currentModelName}
        setCurrentModelName={setCurrentModelName}
        apiKey={apiKey}
        setApiKey={setApiKey}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />
      
      {currentFunc === 'assets' ? (
        <AssetsArea assets={assets} setAssets={setAssets} />
      ) : currentFunc === 'canvasDrama' ? (
        <CanvasDramaArea 
           apiKey={apiKey} 
           conversation={currentConvId ? conversations[currentConvId] : undefined}
           onUpdateCanvas={handleUpdateCanvas}
           onSaveAsset={handleSaveAsset}
           assets={assets}
        />
      ) : (
        <ChatArea
          currentFunc={currentFunc}
          currentDramaSubFunc={currentDramaSubFunc}
          setCurrentDramaSubFunc={setCurrentDramaSubFunc}
          currentSeedanceSubFunc={currentSeedanceSubFunc}
          setCurrentSeedanceSubFunc={setCurrentSeedanceSubFunc}
          currentImageRatio={currentImageRatio}
          setCurrentImageRatio={setCurrentImageRatio}
          currentImageResolution={currentImageResolution}
          setCurrentImageResolution={setCurrentImageResolution}
          messages={currentMessages}
          input={input}
          setInput={setInput}
          onSend={() => handleSend()}
          onStop={handleStop}
          isGenerating={isGenerating}
          onRegenerate={handleRegenerate}
          quickSend={(text) => handleSend(text)}
          setSidebarOpen={setSidebarOpen}
          onSaveAsset={handleSaveAsset}
        />
      )}

      {/* Toast */}
      <div
        className={cn(
          "fixed top-5 right-5 px-4 py-2.5 rounded-md text-[13px] text-white shadow-lg transition-all duration-300 z-[1000] max-w-[300px] pointer-events-none",
          toast ? "translate-y-0 opacity-100" : "-translate-y-5 opacity-0",
          toast?.isError ? "bg-red-500" : "bg-neutral-900"
        )}
      >
        {toast?.msg}
      </div>
    </div>
  );
}

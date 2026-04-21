import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node,
  Edge,
  MarkerType,
  addEdge,
  Connection,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import '@xyflow/react/dist/style.css';
import { MainScriptNode } from './canvasNodes/MainScriptNode';
import { TextNode } from './canvasNodes/TextNode';
import { ImageNode } from './canvasNodes/ImageNode';
import { VideoNode } from './canvasNodes/VideoNode';
import { AssetNode } from './canvasNodes/AssetNode';
import { DeletableEdge } from './canvasNodes/DeletableEdge';
import { callGeminiAPI, callGeminiStreamAPI } from '../lib/api';

const nodeTypes = {
  mainScript: MainScriptNode,
  textNode: TextNode,
  imageNode: ImageNode,
  videoNode: VideoNode,
  assetNode: AssetNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

function CanvasDramaAreaInner({ 
  apiKey,
  conversation,
  onUpdateCanvas,
  onSaveAsset,
  assets
}: { 
  apiKey: string, 
  conversation?: any,
  onUpdateCanvas?: (nodes: Node[], edges: Edge[], title: string) => void,
  onSaveAsset?: (url: string, type: 'image' | 'audio') => void,
  assets?: any[]
}) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const { fitView } = useReactFlow();

  const apiKeyRef = useRef(apiKey);
  useEffect(() => {
    apiKeyRef.current = apiKey;
  }, [apiKey]);

  const [rfInstance, setRfInstance] = useState<any>(null);
  const [menu, setMenu] = useState<{ x: number, y: number, flowPos: { x: number, y: number } } | null>(null);

  useEffect(() => {
    setNodes(nds => nds.map(n => 
      n.type === 'assetNode' 
        ? { ...n, data: { ...n.data, allAssets: assets } } 
        : n
    ));
  }, [assets]);

  const defaultEdgeOptions = {
    type: 'deletable',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    style: { strokeWidth: 2, stroke: '#94a3b8' },
  };

  const handleUploadImage = useCallback((id: string, imageSrc: string) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, imageSrc } } : n));
  }, []);

  const handleDeleteEdge = useCallback((id: string) => {
    setEdges(eds => eds.filter(e => e.id !== id));
  }, []);

  // Make sure edge additions get the delete callback
  useEffect(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      data: { ...e.data, onDelete: handleDeleteEdge }
    })));
  }, [handleDeleteEdge]);

  const handleDoubleClickWrapper = useCallback((event: React.MouseEvent) => {
    // Only detect clicks on the background pane itself, skipping nodes
    const target = event.target as HTMLElement;
    if (target.classList.contains('react-flow__pane') || target.classList.contains('react-flow__background')) {
      if (!rfInstance) return;
      event.preventDefault();
      event.stopPropagation();
      const flowPos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setMenu({ x: event.clientX, y: event.clientY, flowPos });
    }
  }, [rfInstance]);

  const closeMenu = () => setMenu(null);
  const onPaneClick = () => closeMenu();

  const addNode = (type: string) => {
    if (!menu) return;
    const newNodeId = `${type}-${uuidv4()}`;
    const newNode: Node = {
      id: newNodeId,
      type,
      position: menu.flowPos,
      dragHandle: '.drag-handle',
      data: {
        title: type === 'mainScript' ? '剧本对话框' : type === 'assetNode' ? '资产框' : type === 'textNode' ? '文本节点' : '图片节点',
        content: '',
        script: '',
        selectedAssetIds: [],
        allAssets: assets,
        onChange: handleNodeChange,
        onExtract: handleExtract,
        onGeneratePrompt: handleGeneratePrompt,
        onGenerate: handleImageGenerate,
        onUpload: handleUploadImage,
        onSaveAsset: onSaveAsset,
        ratio: '16:9',
        resolution: '1080p',
        modelId: 'gemini-3.1-flash-image-preview',
      }
    };
    setNodes((nds) => nds.concat(newNode));
    closeMenu();
  };

  const handleNodeChange = useCallback((id: string, newData: any) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, ...newData } };
      }
      return n;
    }));
  }, []);

  const handleExtract = useCallback(async (id: string) => {
    setNodes(currentNodes => {
      const mainNode = currentNodes.find(n => n.id === id);
      if (!mainNode || !mainNode.data.script || mainNode.data.isExtracting) return currentNodes;

      // Start extraction asynchronously outside the setState
      setTimeout(() => performExtraction(id, mainNode.data.script as string), 0);

      return currentNodes.map(n => n.id === id ? { ...n, data: { ...n.data, isExtracting: true } } : n);
    });
  }, []);

  const performExtraction = async (id: string, scriptText: string) => {
    const processId = `process-extract-${id}`;
    
    // MainScript is x: 100, y: 50. Size is 500w.
    // 'extract' handle is at 25%.
    const baseX = -120;
    
    setNodes(nds => [
      ...nds,
      {
        id: processId,
        type: 'textNode',
        position: { x: baseX, y: 350 },
        data: { content: '【思考过程】\n等待处理...\n\n【返回结果】\n...', title: 'AI 处理过程' },
        dragHandle: '.drag-handle'
      }
    ]);

    setEdges(eds => [
      ...eds,
      { id: `e-${id}-${processId}`, source: id, sourceHandle: 'extract', target: processId, targetHandle: 'top', ...defaultEdgeOptions }
    ]);

    let thinkingText = '';
    let resultText = '';

    const updateProcessNode = (newThinking: string, newResult: string) => {
        setNodes(nds => nds.map(n => 
            n.id === processId ? {
                ...n,
                data: {
                    ...n.data,
                    content: `【思考过程】\n${newThinking || '...'}\n\n【返回结果】\n${newResult || '...'}`
                }
            } : n
        ));
    };

    try {
        const response = await callGeminiStreamAPI(
            [{ role: 'user', content: scriptText }],
            'seedance',
            'gemini-3.1-pro-preview',
            apiKeyRef.current,
            '素材提取',
            (chunk) => {
                resultText = chunk;
                updateProcessNode(thinkingText, resultText);
            },
            (thinking) => {
                thinkingText = thinking;
                updateProcessNode(thinkingText, resultText);
            },
            new AbortController().signal
        );

        // Parsing the final result text into segments
        const segments = response.text
             .replace(/```[a-z]*\n?/gi, '')
             .split(/(?:\r?\n){2,}/)
             .map(s => s.trim())
             .filter(s => s.length > 0);
        
        let lastSourceId = processId;
        let lastSourceHandle = 'bottom';
        
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        
        segments.forEach((segment, i) => {
            const lines = segment.split(/\r?\n/);
            let title = `素材分段 ${i + 1}`;
            let content = segment;
            
            if (lines.length > 1) {
                // If it looks like a short header, keep it as title and remove from content
                const firstLine = lines[0].replace(/[:：]$/, '').trim();
                if (firstLine.length < 30) {
                    title = firstLine;
                    content = lines.slice(1).join('\n').trim();
                }
            }

            const imageId = `extract-image-${id}-${i}`;
            const yOffset = 550 + i * 360; // 480px node height + spacing

            newNodes.push({
                id: imageId,
                type: 'imageNode', // Image node now includes text section
                position: { x: baseX, y: yOffset },
                data: { 
                    title: title,
                    content: content,
                    imageSrc: null, 
                    modelId: 'gemini-3.1-flash-image-preview', 
                    ratio: '16:9', 
                    resolution: '1080p', 
                    onChange: handleNodeChange, 
                    onGenerate: handleImageGenerate,
                    onUpload: handleUploadImage
                },
                dragHandle: '.drag-handle'
            });

            newEdges.push({ id: `e-v-${lastSourceId}-${imageId}`, source: lastSourceId, sourceHandle: lastSourceHandle, target: imageId, targetHandle: 'top', ...defaultEdgeOptions });

            lastSourceId = imageId;
            lastSourceHandle = 'bottom';
        });

        // Add the unified chunks at once
        setNodes(nds => [...nds, ...newNodes]);
        setEdges(eds => [...eds, ...newEdges]);

    } catch (e) {
        console.error('Extraction error', e);
        updateProcessNode(thinkingText, resultText + '\n\n[处理过程遇到错误]');
    } finally {
        setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, isExtracting: false } } : n));
    }
  };

  const handleGeneratePrompt = useCallback(async (id: string) => {
    setNodes(currentNodes => {
      const mainNode = currentNodes.find(n => n.id === id);
      if (!mainNode || !mainNode.data.script || mainNode.data.isGeneratingPrompt) return currentNodes;

      setTimeout(() => performGeneratePrompt(id, mainNode.data.script as string), 0);
      return currentNodes.map(n => n.id === id ? { ...n, data: { ...n.data, isGeneratingPrompt: true } } : n);
    });
  }, []);

  const performGeneratePrompt = async (id: string, scriptText: string) => {
    const processId = `process-prompt-${id}`;
    
    const baseX = 450;
    
    setNodes(nds => [
      ...nds,
      {
        id: processId,
        type: 'textNode',
        position: { x: baseX, y: 350 },
        data: { content: '【思考过程】\n等待处理...\n\n【返回结果】\n...', title: 'AI 处理过程' },
        dragHandle: '.drag-handle'
      }
    ]);

    setEdges(eds => [
      ...eds,
      { id: `e-${id}-${processId}`, source: id, sourceHandle: 'prompt', target: processId, targetHandle: 'top', ...defaultEdgeOptions }
    ]);
    
    let thinkingText = '';
    let resultText = '';

    const updateProcessNode = (newThinking: string, newResult: string) => {
        setNodes(nds => nds.map(n => 
            n.id === processId ? {
                ...n,
                data: {
                    ...n.data,
                    content: `【思考过程】\n${newThinking || '...'}\n\n【返回结果】\n${newResult || '...'}`
                }
            } : n
        ));
    };

    try {
        const response = await callGeminiStreamAPI(
            [{ role: 'user', content: scriptText }],
            'seedance',
            'gemini-3.1-pro-preview',
            apiKeyRef.current,
            '互动剧提示词',
            (chunk) => {
                resultText = chunk;
                updateProcessNode(thinkingText, resultText);
            },
            (thinking) => {
                thinkingText = thinking;
                updateProcessNode(thinkingText, resultText);
            },
            new AbortController().signal
        );

        // Parsing the final result text into segments
        const segments = response.text
             .replace(/```[a-z]*\n?/gi, '')
             .split(/(?:\r?\n){2,}/)
             .map(s => s.trim())
             .filter(s => s.length > 5);

        let lastSourceId = processId;
        let lastSourceHandle = 'bottom';
        
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        
        segments.forEach((segment, i) => {
            const lines = segment.split(/\r?\n/);
            let title = `场号分段 ${i + 1}`;
            let content = segment;
            
            if (lines.length > 1) {
                // Check if the first line is exactly the scene number
                const firstLine = lines[0].replace(/[:：]$/, '').trim();
                // Usually scene headers are short, e.g. "一场01" or "第一场"
                if (firstLine.length < 30) {
                    title = firstLine;
                    content = lines.slice(1).join('\n').trim();
                }
            }

            const videoId = `prompt-video-${id}-${i}`;
            const yOffset = 550 + i * 360;

            newNodes.push({
                id: videoId,
                type: 'videoNode',
                position: { x: baseX, y: yOffset },
                data: { 
                    title: title,
                    content: content,
                    onChange: handleNodeChange
                },
                dragHandle: '.drag-handle'
            });

            newEdges.push({ id: `e-v-p-${lastSourceId}-${videoId}`, source: lastSourceId, sourceHandle: lastSourceHandle, target: videoId, targetHandle: 'top', ...defaultEdgeOptions });

            lastSourceId = videoId;
            lastSourceHandle = 'bottom';
        });

        // Add the unified chunks at once
        setNodes(nds => [...nds, ...newNodes]);
        setEdges(eds => [...eds, ...newEdges]);

    } catch (e) {
        console.error('Prompt error', e);
        updateProcessNode(thinkingText, resultText + '\n\n[处理过程遇到错误]');
    } finally {
        setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, isGeneratingPrompt: false } } : n));
    }
  };

  const handleImageGenerate = useCallback(async (nodeId: string, textNodeId?: string) => {
    setNodes(currentNodes => {
      const imageNode = currentNodes.find(n => n.id === nodeId);
      const textNode = textNodeId ? currentNodes.find(n => n.id === textNodeId) : imageNode;
      if (!textNode || !imageNode || imageNode.data.isGenerating) return currentNodes;

      setTimeout(() => performImageGenerate(nodeId, textNode.data.content as string, imageNode.data.ratio as string, imageNode.data.resolution as string, imageNode.data.modelId as string), 0);

      return currentNodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: true } } : n);
    });
  }, []);

  const performImageGenerate = async (nodeId: string, textContent: string, ratio: string, resolution: string, modelId: string) => {
    try {
      const prompt = `【要求：比例 ${ratio}，分辨率 ${resolution}】 ${textContent}`;
      const messages = [{ role: 'user' as const, content: prompt }];
      
      const result = await callGeminiAPI(messages, 'yellowImage', modelId, apiKeyRef.current);
      
      const imageMatch = result.text.match(/!\[.*?\]\((data:image\/.*?;base64,.*?)\)/);
      const generatedImageSrc = imageMatch ? imageMatch[1] : null;

      if (generatedImageSrc) {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: false, imageSrc: generatedImageSrc } } : n));
      } else {
        setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: false } } : n));
      }
    } catch (e) {
      console.error(e);
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: false } } : n));
    }
  };

  // Inject callbacks into loaded nodes
  const injectCallbacks = useCallback((loadedNodes: Node[]) => {
    return loadedNodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        onChange: handleNodeChange,
        onExtract: handleExtract,
        onGeneratePrompt: handleGeneratePrompt,
        onGenerate: handleImageGenerate,
        onUpload: handleUploadImage,
        onSaveAsset: onSaveAsset,
        allAssets: assets,
      }
    }));
  }, [handleNodeChange, handleExtract, handleGeneratePrompt, handleImageGenerate, handleUploadImage, onSaveAsset, assets]);

  // Inject callbacks into loaded edges
  const injectEdgeCallbacks = useCallback((loadedEdges: Edge[]) => {
    return loadedEdges.map(e => ({
      ...e,
      data: {
        ...e.data,
        onDelete: handleDeleteEdge,
      }
    }));
  }, [handleDeleteEdge]);

  // Initialization
  useEffect(() => {
    if (conversation?.nodes && conversation.nodes.length > 0) {
      setNodes(injectCallbacks(conversation.nodes));
      setEdges(injectEdgeCallbacks(conversation?.edges || []));
      setTimeout(() => fitView({ duration: 500 }), 50);
    } else {
      setNodes([{
        id: `mainScript-${uuidv4()}`,
        type: 'mainScript',
        position: { x: Math.max(window.innerWidth / 2 - 250, 100), y: 50 },
        dragHandle: '.drag-handle',
        data: {
          title: '默认剧本',
          script: '',
          onChange: handleNodeChange,
          onExtract: handleExtract,
          onGeneratePrompt: handleGeneratePrompt,
          isExtracting: false,
          isGeneratingPrompt: false
        }
      }]);
      setEdges([]);
      setTimeout(() => fitView({ duration: 500 }), 50);
    }
  }, [conversation?.id]);

  // Notify parent of changes to save history
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // We strip out the heavy function references before passing up
    const cleanNodes = nodes.map(n => {
      const { onChange, onExtract, onGeneratePrompt, onGenerate, onUpload, ...cleanData } = n.data;
      return { ...n, data: cleanData };
    });
    const cleanEdges = edges.map(e => {
      const { onDelete, ...cleanData } = e.data || {};
      return { ...e, data: cleanData };
    });
    
    onUpdateCanvas && onUpdateCanvas(cleanNodes, cleanEdges, '超级工作流');
  }, [nodes, edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    []
  );

  return (
    <div 
      className="flex-1 w-full h-full relative font-sans" 
      style={{ background: '#f5f5f5' }}
      onDoubleClick={handleDoubleClickWrapper}
    >
      <ReactFlow
        onInit={setRfInstance}
        onPaneClick={onPaneClick}
        onEdgeDoubleClick={(e, edge) => handleDeleteEdge(edge.id)}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes as any}
        edgeTypes={edgeTypes as any}
        onNodesChange={onNodesChange as any}
        onEdgesChange={onEdgesChange as any}
        onConnect={onConnect}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.01}
        maxZoom={4}
        zoomOnDoubleClick={false}
      >
        <Background gap={20} size={1} />
        <Controls />
      </ReactFlow>

      {menu && (
        <div
          style={{ top: menu.y, left: menu.x }}
          className="absolute z-50 bg-white shadow-xl rounded-xl border border-neutral-200 overflow-hidden min-w-[160px] text-[13px] font-medium"
        >
          <div className="p-1">
            <button onClick={() => addNode('mainScript')} className="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-md transition border-none bg-transparent cursor-pointer">
              超级工作流
            </button>
            <button onClick={() => addNode('assetNode')} className="w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-md transition border-none bg-transparent cursor-pointer">
              资产
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CanvasDramaArea(props: { 
  apiKey: string, 
  conversation?: any,
  onUpdateCanvas?: (nodes: Node[], edges: Edge[], title: string) => void,
  onSaveAsset?: (url: string, type: 'image' | 'audio') => void,
  assets?: any[]
}) {
  return (
    <ReactFlowProvider>
      <CanvasDramaAreaInner {...props} />
    </ReactFlowProvider>
  );
}

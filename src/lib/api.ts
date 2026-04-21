import { SYSTEM_PROMPTS, SAFETY_SETTINGS } from '../constants';
import { FuncType, Message } from '../types';

const GEMINI_API_BASE_URL = 'https://yunwu.ai/v1beta/models';

function buildGeminiRequestBody(messages: Message[], func: FuncType, subFunc?: string) {
  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  if (func === 'yellowImage') {
    return {
      contents,
      generationConfig: {
        responseModalities: ["IMAGE"]
      }
    };
  }

  let systemPrompt = SYSTEM_PROMPTS[func] || SYSTEM_PROMPTS.chat;

  if (func === 'drama' && subFunc) {
    systemPrompt += `\n\n【重要指令】用户已选择功能：${subFunc}。请直接跳过步骤1的询问，直接开始执行该功能的步骤2。`;
  }
  
  if (func === 'seedance' && subFunc === '素材提取') {
    systemPrompt = SYSTEM_PROMPTS.material_extraction;
  }

  return {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
      role: 'user',
    },
    safetySettings: SAFETY_SETTINGS,
    tools: [],
    generationConfig: {
      temperature: 1,
      topP: 1,
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 26240,
      },
    },
  };
}

export async function callGeminiStreamAPI(
  messages: Message[],
  func: FuncType,
  modelId: string,
  apiKey: string,
  subFunc: string | undefined,
  onChunk: (text: string) => void,
  onThinking: (text: string) => void,
  signal: AbortSignal
) {
  if (!apiKey) {
    throw new Error('请先在侧边栏输入 API Key');
  }

  const apiUrl = `${GEMINI_API_BASE_URL}/${modelId}:streamGenerateContent?key=&alt=sse`;
  const body = buildGeminiRequestBody(messages, func, subFunc);
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  };

  const response = await fetch(apiUrl, fetchOptions);

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let errMsg = `API错误: ${response.status}`;
    try {
      const errData = JSON.parse(errText);
      if (errData?.error?.message) errMsg = errData.error.message;
    } catch (e) {
      if (errText) errMsg += ' - ' + errText.slice(0, 200);
    }
    throw new Error(errMsg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No reader available');
  const decoder = new TextDecoder();
  let fullText = '';
  let thinkingText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data:')) {
          const jsonStr = trimmedLine.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const parts = data.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.thought) {
                if (typeof part.thought === 'string') {
                  thinkingText += part.thought;
                  onThinking(thinkingText);
                } else if (part.text && part.text !== 'true') {
                  thinkingText += part.text;
                  onThinking(thinkingText);
                }
              } else if (part.reasoning_content) {
                thinkingText += part.reasoning_content;
                onThinking(thinkingText);
              } else if (part.text && part.text !== 'true') {
                fullText += part.text;
                onChunk(fullText);
              }
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              console.error('JSON parse error or API error:', e);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return { text: fullText, thinking: thinkingText };
}

export async function callGeminiAPI(
  messages: Message[],
  func: FuncType,
  modelId: string,
  apiKey: string,
  subFunc?: string,
  signal?: AbortSignal
) {
  if (!apiKey) {
    throw new Error('请先在侧边栏输入 API Key');
  }

  const apiUrl = `${GEMINI_API_BASE_URL}/${modelId}:generateContent?key=`;
  const body = buildGeminiRequestBody(messages, func, subFunc);
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  };

  const response = await fetch(apiUrl, fetchOptions);

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let errMsg = `API错误: ${response.status}`;
    try {
      const errData = JSON.parse(errText);
      if (errData?.error?.message) errMsg = errData.error.message;
    } catch (e) {
      if (errText) errMsg += ' - ' + errText.slice(0, 200);
    }
    throw new Error(errMsg);
  }

  const data = await response.json();
  
  const parts = data.candidates?.[0]?.content?.parts || [];
  let text = '';
  let thinking = '';
  for (const part of parts) {
    if (part.thought) {
      if (typeof part.thought === 'string') {
        thinking += part.thought;
      } else if (part.text && part.text !== 'true') {
        thinking += part.text;
      }
    } else if (part.inlineData) {
      const mimeType = part.inlineData.mimeType || 'image/jpeg';
      text += `\n\n![Generated Image](data:${mimeType};base64,${part.inlineData.data})\n\n`;
    } else if (part.reasoning_content) {
      thinking += part.reasoning_content;
    } else if (part.text && part.text !== 'true') {
      text += part.text;
    }
  }
  return { text, thinking };
}

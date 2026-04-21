export type FuncType = 'chat' | 'drama' | 'seedance' | 'yellowImage' | 'canvasDrama' | 'assets';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
}

export interface Conversation {
  id: string;
  func: FuncType;
  dramaSubFunc?: string;
  seedanceSubFunc?: string;
  title: string;
  messages: Message[];
  created: number;
  nodes?: any[];
  edges?: any[];
}

export interface Asset {
  id: string;
  type: 'image' | 'audio';
  url: string;
  name: string;
  createdAt: number;
}

export interface ModelOption {
  id: string;
  name: string;
  badge?: string;
}

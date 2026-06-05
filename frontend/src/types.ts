export interface FileItem {
  path: string;
  category: string;
  extension: string;
  size: number;
  description: string | null;
  from_cache?: boolean;
}

export interface QuizQuestion {
  id: number;
  scope: string;
  question: string;
}

export interface GradeResult {
  verdict: 'correct' | 'partial' | 'incorrect';
  score: number;
  explanation: string;
}

export interface Settings {
  provider: 'claude' | 'openai' | 'deepseek' | 'ollama';
  api_key: string;
  model: string;
  ollama_url: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

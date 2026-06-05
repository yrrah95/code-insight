import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  isChatting: boolean;
  disabled: boolean;
  onSend: (msg: string) => void;
  onClear: () => void;
}

export default function ChatPanel({ messages, isChatting, disabled, onSend, onClear }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || isChatting || disabled) return;
    setInput('');
    onSend(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI 問答</span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            清除對話
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3">
        {messages.length === 0 && !disabled && (
          <div className="text-center text-gray-600 text-xs mt-8">
            <p className="mb-2 text-2xl">💬</p>
            <p>分析完成後，你可以在這裡問任何關於這個專案的問題</p>
            <p className="mt-2 text-gray-700">例如：「入口點在哪？」「這個 service 做什麼？」</p>
          </div>
        )}
        {disabled && messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs mt-8">
            <p>請先掃描並分析專案</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-violet-700 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-xs max-w-none prose-p:text-gray-200 prose-code:text-violet-300 prose-headings:text-gray-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.streaming && (
                <span className="inline-block w-1 h-3 bg-violet-400 ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 border-t border-gray-800 p-3 flex gap-2 items-end"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isChatting}
          placeholder={disabled ? '請先完成分析' : '輸入問題... (Enter 送出)'}
          rows={2}
          className="flex-1 bg-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 resize-none border border-gray-700 focus:outline-none focus:border-violet-500 placeholder-gray-600 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={disabled || isChatting || !input.trim()}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-3 py-2 rounded-lg transition-colors flex-shrink-0"
        >
          {isChatting ? '⏳' : '送出'}
        </button>
      </form>
    </div>
  );
}

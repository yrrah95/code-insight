import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../types';
import { useT } from '../i18n/LocaleContext';

interface Props {
  messages: ChatMessage[];
  isChatting: boolean;
  disabled: boolean;
  onSend: (msg: string) => void;
  onClear: () => void;
}

export default function ChatPanel({ messages, isChatting, disabled, onSend, onClear }: Props) {
  const t = useT();
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('chatHeader')}</span>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={12} />
            {t('clearChat')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3">
        {messages.length === 0 && !disabled && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <MessageSquare size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-gray-600 text-xs mb-1">{t('chatEmptyTitle')}</p>
              <p className="text-gray-400 text-xs">{t('chatEmptyHint')}</p>
            </div>
          </div>
        )}
        {disabled && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <MessageSquare size={18} className="text-gray-300" />
            </div>
            <p className="text-gray-400 text-xs">{t('chatDisabled')}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-xs max-w-none prose-p:text-gray-700 prose-code:text-indigo-700 prose-headings:text-gray-900 prose-a:text-indigo-600">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.streaming && (
                <span className="inline-block w-1 h-3 bg-indigo-400 ml-0.5 animate-pulse rounded-full" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 border-t border-gray-100 p-3 flex gap-2 items-end bg-white"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isChatting}
          placeholder={disabled ? t('chatPlaceholderDisabled') : t('chatPlaceholder')}
          rows={2}
          className="flex-1 bg-white text-gray-800 text-xs rounded-xl px-3 py-2 resize-none border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 disabled:opacity-40 transition-all"
        />
        <button
          type="submit"
          disabled={disabled || isChatting || !input.trim()}
          className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0 flex items-center justify-center"
        >
          {isChatting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}

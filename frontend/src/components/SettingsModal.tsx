import { useEffect, useState } from 'react';
import type { Settings } from '../types';
import { api } from '../api/client';

interface Props {
  onClose: () => void;
}

const PROVIDERS = [
  { value: 'claude', label: 'Claude (Anthropic)', modelPlaceholder: 'claude-sonnet-4-6' },
  { value: 'openai', label: 'OpenAI (GPT)', modelPlaceholder: 'gpt-4o' },
  { value: 'deepseek', label: 'DeepSeek', modelPlaceholder: 'deepseek-chat' },
  { value: 'ollama', label: 'Ollama (本地)', modelPlaceholder: 'llama3.2' },
];

export default function SettingsModal({ onClose }: Props) {
  const [settings, setSettings] = useState<Settings>({
    provider: 'claude',
    api_key: '',
    model: '',
    ollama_url: 'http://localhost:11434',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings(settings);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch (e) {
      alert('儲存失敗：' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const currentProvider = PROVIDERS.find(p => p.value === settings.provider)!;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-gray-100 font-semibold text-base">LLM 設定</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">提供商</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setSettings(s => ({ ...s, provider: p.value as Settings['provider'] }))}
                  className={`py-2 px-3 rounded-lg text-xs border transition-colors ${
                    settings.provider === p.value
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {settings.provider !== 'ollama' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">API Key</label>
              <input
                type="password"
                value={settings.api_key}
                onChange={e => setSettings(s => ({ ...s, api_key: e.target.value }))}
                placeholder="sk-..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 placeholder-gray-600"
              />
            </div>
          )}

          {settings.provider === 'ollama' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Ollama URL</label>
              <input
                type="text"
                value={settings.ollama_url}
                onChange={e => setSettings(s => ({ ...s, ollama_url: e.target.value }))}
                placeholder="http://localhost:11434"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 placeholder-gray-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              模型名稱 <span className="text-gray-600">（留空使用預設：{currentProvider.modelPlaceholder}）</span>
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
              placeholder={currentProvider.modelPlaceholder}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-violet-500 placeholder-gray-600"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            {saved ? '✓ 已儲存' : saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}

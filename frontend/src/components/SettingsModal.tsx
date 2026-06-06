import { useEffect, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import type { Settings } from '../types';
import { api } from '../api/client';
import { useT } from '../i18n/LocaleContext';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const t = useT();
  const [settings, setSettings] = useState<Settings>({
    provider: 'claude',
    api_key: '',
    model: '',
    ollama_url: 'http://localhost:11434',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const PROVIDERS = [
    { value: 'claude', label: 'Claude (Anthropic)', modelPlaceholder: 'claude-sonnet-4-6' },
    { value: 'openai', label: 'OpenAI (GPT)', modelPlaceholder: 'gpt-4o' },
    { value: 'deepseek', label: 'DeepSeek', modelPlaceholder: 'deepseek-chat' },
    { value: 'ollama', label: t('ollamaLocalLabel'), modelPlaceholder: 'llama3.2' },
  ];

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
      alert(t('saveFailed', { message: (e as Error).message }));
    } finally {
      setSaving(false);
    }
  };

  const currentProvider = PROVIDERS.find(p => p.value === settings.provider)!;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-gray-900 font-semibold text-base">{t('settingsModalTitle')}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">{t('providerLabel')}</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setSettings(s => ({ ...s, provider: p.value as Settings['provider'] }))}
                  className={`py-2 px-3 rounded-xl text-xs border transition-colors text-left font-medium ${
                    settings.provider === p.value
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {settings.provider !== 'ollama' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">API Key</label>
              <input
                type="password"
                value={settings.api_key}
                onChange={e => setSettings(s => ({ ...s, api_key: e.target.value }))}
                placeholder="sk-..."
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 font-mono transition-all"
              />
            </div>
          )}

          {settings.provider === 'ollama' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Ollama URL</label>
              <input
                type="text"
                value={settings.ollama_url}
                onChange={e => setSettings(s => ({ ...s, ollama_url: e.target.value }))}
                placeholder="http://localhost:11434"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 font-mono transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              {t('modelLabel')}
              <span className="text-gray-400 font-normal ml-1">{t('modelDefault', { placeholder: currentProvider.modelPlaceholder })}</span>
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
              placeholder={currentProvider.modelPlaceholder}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 font-mono transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors font-medium"
          >
            {t('cancelBtn')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
          >
            {saved ? <Check size={13} /> : saving ? <Loader2 size={13} className="animate-spin" /> : null}
            {saved ? t('savedBtn').replace('✓ ', '') : saving ? t('savingBtn').replace('儲存中...', t('savingBtn')) : t('saveBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

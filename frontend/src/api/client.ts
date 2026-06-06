const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

async function throwIfError(res: Response) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? res.statusText);
  }
}

function readSSE(
  res: Response,
  onEvent: (data: Record<string, unknown>) => void,
): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  const pump = (): Promise<void> =>
    reader.read().then(({ done, value }) => {
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() ?? '';
      for (const part of parts) {
        if (part.startsWith('data: ')) {
          try {
            onEvent(JSON.parse(part.slice(6)));
          } catch {
            // ignore malformed
          }
        }
      }
      return pump();
    });

  return pump();
}

export const api = {
  async scan(path: string) {
    const res = await fetch(`${BASE}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    await throwIfError(res);
    return res.json();
  },

  async cloneRepo(url: string) {
    const res = await fetch(`${BASE}/api/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    await throwIfError(res);
    return res.json();
  },

  async analyzeStream(
    onProgress: (index: number, total: number, path: string, category: string, description: string) => void,
    onDone: (skipped?: boolean) => void,
  ) {
    const res = await fetch(`${BASE}/api/analyze`, { method: 'POST' });
    await throwIfError(res);
    await readSSE(res, (data) => {
      if (data.done) { onDone(data.skipped as boolean | undefined); return; }
      onProgress(
        data.index as number,
        data.total as number,
        data.path as string,
        data.category as string,
        data.description as string,
      );
    });
  },

  async reportStream(onChunk: (reportIndex: number, text: string) => void, onDone: () => void) {
    const res = await fetch(`${BASE}/api/report/generate`, { method: 'POST' });
    await throwIfError(res);
    await readSSE(res, (data) => {
      if (data.done) { onDone(); return; }
      if (data.chunk !== undefined) onChunk(data.report as number, data.chunk as string);
    });
  },

  async chatStream(
    message: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
  ) {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    await throwIfError(res);
    await readSSE(res, (data) => {
      if (data.chunk) onChunk(data.chunk as string);
      if (data.done) onDone();
    });
  },

  async explainStream(
    title: string,
    content: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
  ) {
    const res = await fetch(`${BASE}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    await throwIfError(res);
    await readSSE(res, (data) => {
      if (data.chunk) onChunk(data.chunk as string);
      if (data.done) onDone();
    });
  },

  async clearChat() {
    await fetch(`${BASE}/api/chat/clear`, { method: 'POST' });
  },

  async clearCache() {
    const res = await fetch(`${BASE}/api/cache`, { method: 'DELETE' });
    await throwIfError(res);
  },

  async getHistory(): Promise<{ paths: string[] }> {
    const res = await fetch(`${BASE}/api/history`);
    return res.json();
  },

  async addHistory(path: string): Promise<void> {
    await fetch(`${BASE}/api/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
  },

  async exportZip(): Promise<Blob> {
    const res = await fetch(`${BASE}/api/export/zip`);
    await throwIfError(res);
    return res.blob();
  },

  async exportCodebaseMd(): Promise<{ content: string; saved_to_project: boolean }> {
    const res = await fetch(`${BASE}/api/export/codebase-md`);
    await throwIfError(res);
    return res.json();
  },

  async getSettings() {
    const res = await fetch(`${BASE}/api/settings`);
    return res.json();
  },

  async saveSettings(settings: unknown) {
    const res = await fetch(`${BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    await throwIfError(res);
    return res.json();
  },

  async browse(): Promise<string> {
    const res = await fetch(`${BASE}/api/browse`);
    const data = await res.json();
    return data.path ?? '';
  },

  async generateQuiz() {
    const res = await fetch(`${BASE}/api/quiz/generate`, { method: 'POST' });
    await throwIfError(res);
    return res.json();
  },

  async gradeAnswer(question: string, answer: string) {
    const res = await fetch(`${BASE}/api/quiz/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });
    await throwIfError(res);
    return res.json();
  },
};

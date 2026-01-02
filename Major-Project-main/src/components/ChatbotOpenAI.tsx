import React, { useState, useRef, useEffect } from 'react';
import { chatWithOpenAI, ChatMessage } from '../services/chatbotOpenAI';

export default function ChatbotOpenAI(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const reply = await chatWithOpenAI(newHistory);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = { role: 'assistant', content: `Error: ${err?.message || String(err)}` };
      setMessages((m) => [...m, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 max-w-full bg-white/95 dark:bg-slate-900/95 border rounded-lg shadow-lg overflow-hidden">
      <div className="px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold">Chatbot (OpenAI)</div>
      <div className="p-3 h-64 flex flex-col gap-2 overflow-auto">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500">Ask me anything — make sure `VITE_OPENAI_API_KEY` is set.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block px-3 py-1 rounded-md ${m.role === 'user' ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-900'}`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="px-3 py-2 border-t bg-white dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={loading ? 'Waiting for reply…' : 'Type a message...'}
            className="flex-1 px-2 py-1 border rounded-md text-sm"
            disabled={loading}
          />
          <button type="submit" disabled={loading} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm">
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

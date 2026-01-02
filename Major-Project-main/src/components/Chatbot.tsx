import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini, ChatMessage } from '../services/chatbotService';
import { chatWithOpenAI } from '../services/chatbotOpenAI';

export default function Chatbot(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'expanded' | 'minimized' | 'closed'>(() => {
    try {
      return (localStorage.getItem('chatbot_mode') as 'expanded' | 'minimized' | 'closed') || 'expanded';
    } catch (e) {
      return 'expanded';
    }
  });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem('chatbot_pos');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    pointerId: number;
    moved: boolean;
  } | null>(null);
  const suppressedClickRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // initialize default position if none
  useEffect(() => {
    if (pos) return;
    if (typeof window === 'undefined') return;
    const defaultWidth = 320;
    const defaultHeight = 240;
    const x = window.innerWidth - defaultWidth - 24;
    const y = window.innerHeight - defaultHeight - 24;
    const initial = { x, y };
    setPos(initial);
    try {
      localStorage.setItem('chatbot_pos', JSON.stringify(initial));
    } catch (e) {}
  }, [pos]);

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
      // Prefer Gemini; if it fails, fall back to OpenAI
      let reply: string;
      try {
        reply = await chatWithGemini(newHistory);
      } catch (gemErr) {
        // Attempt OpenAI fallback
        try {
          reply = await chatWithOpenAI(newHistory);
        } catch (openErr) {
          // Both failed — show combined error
          const combined = `Gemini error: ${gemErr?.message || String(gemErr)}; OpenAI error: ${openErr?.message || String(openErr)}`;
          const errorMsg: ChatMessage = { role: 'assistant', content: `Error: ${combined}` };
          setMessages((m) => [...m, errorMsg]);
          return;
        }
      }

      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };
      setMessages((m) => [...m, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }

  // Use pointer events for robust drag (mouse + touch) and click-vs-drag handling
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      if (e.pointerId !== draggingRef.current.pointerId) return;
      const { startX, startY, origX, origY } = draggingRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const next = { x: Math.max(8, origX + dx), y: Math.max(8, origY + dy) };
      draggingRef.current.moved = draggingRef.current.moved || Math.hypot(dx, dy) > 4;
      setPos(next);
    }

    function onPointerUp(e: PointerEvent) {
      if (!draggingRef.current) return;
      if (e.pointerId !== draggingRef.current.pointerId) return;
      try {
        localStorage.setItem('chatbot_pos', JSON.stringify(pos));
      } catch (err) {}
      const wasMoved = draggingRef.current.moved;
      draggingRef.current = null;
      // suppress the following click event if there was a meaningful drag
      if (wasMoved) {
        suppressedClickRef.current = true;
        // clear on next tick after browser generates click
        setTimeout(() => (suppressedClickRef.current = false), 0);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    // cleanup on unmount
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [pos]);

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    if (!pos) return;
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      pointerId: e.pointerId,
      moved: false,
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      if (ev.pointerId !== draggingRef.current.pointerId) return;
      const { startX, startY, origX, origY } = draggingRef.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const next = { x: Math.max(8, origX + dx), y: Math.max(8, origY + dy) };
      draggingRef.current.moved = draggingRef.current.moved || Math.hypot(dx, dy) > 4;
      setPos(next);
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      if (ev.pointerId !== draggingRef.current.pointerId) return;
      try {
        localStorage.setItem('chatbot_pos', JSON.stringify(pos));
      } catch (err) {}
      const wasMoved = draggingRef.current.moved;
      draggingRef.current = null;
      if (wasMoved) {
        suppressedClickRef.current = true;
        setTimeout(() => (suppressedClickRef.current = false), 0);
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  function stopDrag() {
    // noop: pointerup handler handles cleanup
  }

  function handleMinimize() {
    // snap icon to bottom-right corner when minimizing
    if (typeof window !== 'undefined') {
      const iconSize = 48;
      const x = Math.max(8, window.innerWidth - iconSize - 24);
      const y = Math.max(8, window.innerHeight - iconSize - 24);
      const p = { x, y };
      setPos(p);
      try {
        localStorage.setItem('chatbot_pos', JSON.stringify(p));
      } catch (e) {}
    }
    setMode('minimized');
    try {
      localStorage.setItem('chatbot_mode', 'minimized');
    } catch (e) {}
  }

  function handleClose() {
    setMode('closed');
    try {
      localStorage.setItem('chatbot_mode', 'closed');
    } catch (e) {}
  }

  function handleRestore() {
    // Ensure restored panel is fully visible (not cut off)
    try {
      const panelW = 320;
      const panelH = 360;
      if (typeof window !== 'undefined') {
        const maxX = Math.max(8, window.innerWidth - panelW - 8);
        const maxY = Math.max(8, window.innerHeight - panelH - 8);
        let next = pos ?? { x: Math.max(8, window.innerWidth - panelW - 24), y: Math.max(8, window.innerHeight - panelH - 24) };
        next = { x: Math.min(Math.max(8, next.x), maxX), y: Math.min(Math.max(8, next.y), maxY) };
        setPos(next);
        try {
          localStorage.setItem('chatbot_pos', JSON.stringify(next));
        } catch (e) {}
      }
    } catch (e) {}
    setMode('expanded');
    try {
      localStorage.setItem('chatbot_mode', 'expanded');
    } catch (e) {}
  }

  if (mode === 'closed') {
    return (
      <div className="fixed bottom-6 right-6">
        <button
          onClick={handleRestore}
          className="px-3 py-2 bg-indigo-600 text-white rounded-full shadow-lg"
          aria-label="Open chatbot"
        >
          Open Chat
        </button>
      </div>
    );  
  }

  // when minimized show movable icon
  if (mode === 'minimized') {
    const style: React.CSSProperties = pos
      ? { position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }
      : { position: 'fixed', right: 24, bottom: 24, zIndex: 9999 };

    function onIconClick(e: React.MouseEvent) {
      if (suppressedClickRef.current) {
        suppressedClickRef.current = false;
        return;
      }
      handleRestore();
    }

    return (
      <div style={style} onPointerDown={startDrag}>
        <button
          onClick={onIconClick}
          className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
          aria-label="Restore chatbot"
          title="Open chat"
          style={{
            background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
            border: 'none',
            color: 'white',
            padding: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" fill="rgba(255,255,255,0.08)" />
            <path d="M7 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="white" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      style={pos ? { position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 } : undefined}
      className="w-80 max-w-full bg-white/95 dark:bg-slate-900/95 border rounded-lg shadow-lg overflow-hidden"
    >
      <div onPointerDown={startDrag} className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold cursor-move flex items-center justify-between">
        <span>Chatbot</span>
        <div className="flex gap-2">
            <button onClick={(e) => { if (suppressedClickRef.current) { suppressedClickRef.current = false; return; } handleMinimize(); }} className="text-sm opacity-90">_</button>
            <button onClick={(e) => { if (suppressedClickRef.current) { suppressedClickRef.current = false; return; } handleClose(); }} className="text-sm opacity-90">✕</button>
        </div>
      </div>
      <div className="p-3 h-64 flex flex-col gap-2 overflow-auto">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500">Ask me anything...</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block px-3 py-1 rounded-md ${m.role === 'user' ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-100 text-slate-900'}`}>
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
          <button type="submit" disabled={loading} className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm">
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

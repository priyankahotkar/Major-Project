import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Bot, RefreshCw } from "lucide-react";
import {
  sendMessageToGemini,
  isGeminiConfigured,
  sendMessageToOpenAI,
  isOpenAIConfigured,
} from "@/services/chatbotService";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  error?: boolean;
}

// History formats differ between Gemini and OpenAI — keep both in sync
interface GeminiTurn {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface OpenAITurn {
  role: "system" | "user" | "assistant";
  content: string;
}

const OPENAI_SYSTEM: OpenAITurn = {
  role: "system",
  content:
    "You are CareerMentix Assistant, a helpful AI chatbot on the CareerMentix mentoring platform. Help users with career advice, platform navigation (booking sessions, forum, roadmaps, AI interview practice), interview prep, and general tech career questions. Be concise and friendly.",
};

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  text: "Hi! I'm the CareerMentix Assistant 👋 I can help you with career advice, interview prep, navigating the platform, and more. What's on your mind?",
  sender: "bot",
  timestamp: new Date(),
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiTurn[]>([]);
  const [openAIHistory, setOpenAIHistory] = useState<OpenAITurn[]>([OPENAI_SYSTEM]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleReset = () => {
    setMessages([{ ...WELCOME_MESSAGE, id: "welcome-" + Date.now(), timestamp: new Date() }]);
    setGeminiHistory([]);
    setOpenAIHistory([OPENAI_SYSTEM]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      let reply = "";

      if (isGeminiConfigured()) {
        reply = await sendMessageToGemini(geminiHistory, text);
        // Append to Gemini history
        setGeminiHistory((prev) => [
          ...prev,
          { role: "user", parts: [{ text }] },
          { role: "model", parts: [{ text: reply }] },
        ]);
        // Sync OpenAI history too (for seamless fallback next time)
        setOpenAIHistory((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: reply },
        ]);
      } else if (isOpenAIConfigured()) {
        reply = await sendMessageToOpenAI(openAIHistory, text);
        setOpenAIHistory((prev) => [
          ...prev,
          { role: "user", content: text },
          { role: "assistant", content: reply },
        ]);
      } else {
        throw new Error("No AI API key configured. Please add VITE_GEMINI_API_KEY to your .env file.");
      }

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: reply, sender: "bot", timestamp: new Date() },
      ]);
    } catch (err) {
      const errText =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";

      // Try OpenAI as fallback if Gemini failed
      if (isGeminiConfigured() && isOpenAIConfigured()) {
        try {
          const reply = await sendMessageToOpenAI(openAIHistory, text);
          setOpenAIHistory((prev) => [
            ...prev,
            { role: "user", content: text },
            { role: "assistant", content: reply },
          ]);
          setMessages((prev) => [
            ...prev,
            { id: (Date.now() + 1).toString(), text: reply, sender: "bot", timestamp: new Date() },
          ]);
          setIsLoading(false);
          return;
        } catch {
          // both failed — fall through to error message below
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: errText,
          sender: "bot",
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {isOpen && (
        <div className="flex h-[32rem] w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-white/20 p-1">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">CareerMentix Assistant</p>
                <p className="text-xs text-blue-100">Powered by AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="New conversation"
                className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                    msg.sender === "user"
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : msg.error
                      ? "rounded-bl-sm border border-red-200 bg-red-50 text-red-700"
                      : "rounded-bl-sm border border-gray-100 bg-white text-gray-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                  <p
                    className={`mt-1 text-right text-[10px] ${
                      msg.sender === "user" ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-white px-3 py-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask me anything…"
                disabled={isLoading}
                className="flex-1 rounded-xl border border-gray-200 bg-slate-50 px-3.5 py-2 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow transition hover:bg-blue-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg transition hover:scale-105 hover:shadow-xl active:scale-95"
        aria-label="Open chat assistant"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>
    </div>
  );
}

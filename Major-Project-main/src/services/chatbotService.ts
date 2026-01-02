import { GoogleGenerativeAI } from '@google/generative-ai';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function chatWithGemini(messages: ChatMessage[]): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set. Add it to your .env and restart the dev server.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Build a simple conversational prompt preserving roles
  const prompt = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n') + '\nAssistant:';

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

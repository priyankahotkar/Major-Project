export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function chatWithOpenAI(messages: ChatMessage[]): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set. Add it to your .env and restart the dev server.');
  }

  const body = {
    model: 'gpt-4o-mini',
    messages: messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    temperature: 0.7,
    max_tokens: 800,
  } as any;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error: ${text}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return text;
}

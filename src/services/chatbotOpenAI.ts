const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn("VITE_OPENAI_API_KEY is not set in environment variables");
}

export async function sendMessageToOpenAI(message: string): Promise<string> {
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "No response received";

    return text;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

export function isOpenAIConfigured(): boolean {
  return !!apiKey;
}

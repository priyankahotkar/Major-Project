import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_PROMPT = `You are CareerMentix Assistant, a helpful AI chatbot embedded in the CareerMentix mentoring platform.
CareerMentix connects mentees with experienced mentors for career guidance, skill development, and professional growth.

You help users with:
- Navigating the platform (booking sessions, using the forum, roadmaps, AI interview practice, notes, video/voice calls)
- Career advice, resume tips, and interview preparation
- Understanding how mentoring sessions work
- General programming, software engineering, and tech career questions

Be concise, friendly, and professional. If a question is completely unrelated to careers or the platform, gently redirect the conversation.`;

const MODEL_CANDIDATES: Array<{ name: string; supportsSystemInstruction: boolean }> = [
  { name: "gemini-2.0-flash", supportsSystemInstruction: true },
  { name: "gemini-2.0-flash-lite", supportsSystemInstruction: true },
  { name: "gemma-3-1b-it", supportsSystemInstruction: false },
];

function isModelAvailabilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /quota|resource_exhausted|429|404|not found|not supported/i.test(message);
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function sendMessageToGemini(
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  userMessage: string
): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini API key is not configured (VITE_GEMINI_API_KEY).");
  }

  let lastError: unknown = null;

  for (const modelConfig of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel(
        modelConfig.supportsSystemInstruction
          ? { model: modelConfig.name, systemInstruction: SYSTEM_PROMPT }
          : { model: modelConfig.name }
      );

      const messageToSend =
        modelConfig.supportsSystemInstruction || history.length > 0
          ? userMessage
          : `${SYSTEM_PROMPT}\n\nUser question: ${userMessage}`;

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(messageToSend);
      const text = result.response.text().trim();

      if (!text) {
        throw new Error(`Model ${modelConfig.name} returned an empty response.`);
      }

      return text;
    } catch (error) {
      lastError = error;

      // Try next model only for model/quota related errors.
      if (!isModelAvailabilityError(error)) {
        throw error;
      }
    }
  }

  const details = lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(`All configured AI models are currently unavailable. ${details}`);
}

export const isGeminiConfigured = () => Boolean(apiKey);

export function isOpenAIConfigured(): boolean {
  return Boolean(openAIApiKey && openAIApiKey.startsWith("sk-"));
}

export async function sendMessageToOpenAI(
  history: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error("VITE_OPENAI_API_KEY is missing or invalid.");
  }

  const messages = [...history, { role: "user" as const, content: userMessage }];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as OpenAIResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }
  return text;
}

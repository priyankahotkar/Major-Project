Chatbot Integration

Files added
- `src/services/chatbotService.ts` — Gemini client wrapper.
- `src/services/chatbotOpenAI.ts` — OpenAI fallback wrapper.
- `src/components/Chatbot.tsx` — Gemini-first chatbot (falls back to OpenAI).
- `src/components/ChatbotOpenAI.tsx` — OpenAI-only chatbot variant.

Setup
1. Add API keys to a `.env` file at the project root (Vite requires `VITE_` prefix):

VITE_GEMINI_API_KEY=your_gemini_key_here
VITE_OPENAI_API_KEY=your_openai_key_here

2. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Usage
- To render the Gemini-first chatbot, import and add the component where you want it (example in `src/App.tsx`):

```tsx
import Chatbot from "./components/Chatbot";

function App() {
  return (
    <>
      {/* your existing app */}
      <Chatbot />
    </>
  );
}

export default App;
```

- To use the OpenAI-only variant import `ChatbotOpenAI` instead.

Notes
- The widgets appear fixed at the bottom-right of the viewport.
- If neither API key is present or both calls fail, the component will show an error message in the chat stream.
- No existing files were changed except `src/components/Chatbot.tsx` (to add fallback behavior) as requested.

If you want, I can now inject the import/usage into `src/App.tsx` for you. Reply "yes" to proceed or "no" to leave it for manual integration.

import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Container } from "@/components/ui/layout";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea, Select, Input } from "@/components/ui/form";
import { FadeIn } from "@/components/ui/animations";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  GeminiService,
  InterviewStage,
  InterviewState,
  InterviewTurn,
} from "@/services/gemini";
import { db } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

type MessageRole = "interviewer" | "user" | "system";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  stage: InterviewStage;
}

const initialInterviewState: InterviewState = {
  stage: "introduction",
  difficulty: "easy",
  turns: [],
};

const stagePlan: InterviewStage[] = ["introduction", "technical", "coding", "behavioral"];
const stageLimits: Record<InterviewStage, number> = {
  introduction: 1,
  technical: 3,
  coding: 2,
  behavioral: 2,
  summary: 0,
};
const totalQuestionLimit = 10;

export function AIInterviewPage() {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [targetRole, setTargetRole] = useState("SDE 1");
  const [preferredLanguage, setPreferredLanguage] = useState("Java");
  const [state, setState] = useState<InterviewState>(initialInterviewState);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [summaryMarkdown, setSummaryMarkdown] = useState<string | null>(null);
  const [stageCounts, setStageCounts] = useState<Record<InterviewStage, number>>({
    introduction: 0,
    technical: 0,
    coding: 0,
    behavioral: 0,
    summary: 0,
  });

  const geminiService = useMemo(() => {
    try {
      return new GeminiService();
    } catch (error) {
      console.error("Failed to init GeminiService:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!geminiService) {
      showNotification({
        title: "AI not configured",
        message: "Gemini API key is missing. Please configure VITE_GEMINI_API_KEY.",
      });
    }
  }, [geminiService, showNotification]);

  const pushMessage = (message: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), ...message }]);
  };

  const startInterview = async () => {
    if (!geminiService || isLoading) return;
    setIsLoading(true);
    setHasStarted(true);
    setMessages([]);
    setState(initialInterviewState);
    setIsFinished(false);
    setSummaryMarkdown(null);
    setStageCounts({
      introduction: 0,
      technical: 0,
      coding: 0,
      behavioral: 0,
      summary: 0,
    });

    pushMessage({
      role: "system",
      stage: "introduction",
      content:
        "Welcome to the AI Interview. I will ask you one question at a time across CS fundamentals, Java coding, and behavioral scenarios.",
    });

    try {
      const result = await geminiService.generateInterviewStep({
        state: initialInterviewState,
        lastUserAnswer: "",
        targetRole,
        preferredLanguage,
      });

      pushMessage({
        role: "interviewer",
        stage: "introduction",
        content: result.interviewerMessage,
      });

      setState((prev) => ({
        ...prev,
        stage: result.nextStage,
        difficulty: result.nextDifficulty,
      }));
    } catch (error) {
      console.error("Error starting interview:", error);
      showNotification({
        title: "Error",
        message: "Failed to start interview. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getNextStage = (current: InterviewStage, counts: Record<InterviewStage, number>) => {
    if (current === "summary") return "summary";
    const currentIdx = stagePlan.indexOf(current);
    const currentLimit = stageLimits[current] ?? 0;
    const exceededCurrent = counts[current] >= currentLimit;
    const atEnd = currentIdx === stagePlan.length - 1;
    if (!exceededCurrent) return current;
    if (atEnd) return "summary";
    return stagePlan[currentIdx + 1];
  };

  const shouldForceSummary = (counts: Record<InterviewStage, number>) => {
    const total =
      counts.introduction + counts.technical + counts.coding + counts.behavioral;
    return total >= totalQuestionLimit;
  };

  const produceSummary = async (updatedState: InterviewState) => {
    if (!geminiService) return;
    try {
      const summaryResult = await geminiService.generateInterviewStep({
        state: { ...updatedState, stage: "summary" },
        lastUserAnswer: "",
        targetRole,
        preferredLanguage,
      });

      pushMessage({
        role: "interviewer",
        stage: "summary",
        content:
          summaryResult.interviewerMessage ||
          "Thank you for completing the interview. Here is your report:",
      });

      if (summaryResult.summaryMarkdown) {
        setSummaryMarkdown(summaryResult.summaryMarkdown);
      }

      setState({
        ...updatedState,
        stage: "summary",
        difficulty: summaryResult.nextDifficulty,
      });
      setIsFinished(true);

      if (user) {
        try {
          await addDoc(collection(db, "aiInterviewSessions"), {
            userId: user.uid,
            email: user.email,
            targetRole,
            preferredLanguage,
            createdAt: serverTimestamp(),
            report: summaryResult.summaryMarkdown ?? summaryResult.interviewerMessage,
            turns: updatedState.turns,
          });
        } catch (err) {
          console.error("Failed to store interview session:", err);
        }
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      showNotification({
        title: "Error",
        message: "Could not generate final summary. Please restart the interview.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !geminiService || isLoading || isFinished) return;

    const userAnswer = input.trim();
    setInput("");

    pushMessage({
      role: "user",
      stage: state.stage,
      content: userAnswer,
    });

    setIsLoading(true);

    try {
      const lastTurn: InterviewTurn | undefined = state.turns[state.turns.length - 1];

      const result = await geminiService.generateInterviewStep({
        state,
        lastUserAnswer: userAnswer,
        targetRole,
        preferredLanguage,
      });

      pushMessage({
        role: "interviewer",
        stage: result.nextStage,
        content: result.interviewerMessage,
      });

      const updatedTurn: InterviewTurn = {
        stage: state.stage,
        question: lastTurn ? lastTurn.question : "Previous interviewer question",
        userAnswer,
        feedback: result.interviewerMessage,
        difficulty: state.difficulty,
      };

      const newCounts = {
        ...stageCounts,
        [state.stage]: stageCounts[state.stage] + 1,
      };
      setStageCounts(newCounts);

      const updatedState: InterviewState = {
        stage: result.nextStage,
        difficulty: result.nextDifficulty,
        turns: [...state.turns, updatedTurn],
      };

      const forceSummary = result.isFinal || shouldForceSummary(newCounts);
      const nextStage = forceSummary ? "summary" : getNextStage(state.stage, newCounts);

      if (forceSummary || nextStage === "summary") {
        await produceSummary({ ...updatedState, stage: "summary" });
      } else {
        setState({ ...updatedState, stage: nextStage });
      }
    } catch (error) {
      console.error("Error during interview step:", error);
      showNotification({
        title: "Error",
        message: "Something went wrong while processing your answer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setState(initialInterviewState);
    setMessages([]);
    setInput("");
    setHasStarted(false);
    setIsFinished(false);
    setSummaryMarkdown(null);
    setStageCounts({
      introduction: 0,
      technical: 0,
      coding: 0,
      behavioral: 0,
      summary: 0,
    });
  };

  return (
    <Layout>
      <Container>
        <FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-8 items-start">
            <Card className="h-full flex flex-col">
              <CardTitle className="flex items-center justify-between">
                <span>AI Mock Interview</span>
                <span className="text-sm font-normal text-gray-500">
                  One question at a time, adaptive difficulty
                </span>
              </CardTitle>
              <CardContent className="flex flex-col gap-4 flex-1">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 border-b pb-4 mb-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Target Role"
                      name="targetRole"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. SDE 1, Java Backend"
                    />
                    <Select
                      label="Preferred Language"
                      name="preferredLanguage"
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      options={[
                        { value: "Java", label: "Java (default)" },
                        { value: "JavaScript", label: "JavaScript" },
                        { value: "TypeScript", label: "TypeScript" },
                        { value: "Python", label: "Python" },
                      ]}
                    />
                    <div className="flex items-end gap-2">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={startInterview}
                        disabled={isLoading || !geminiService}
                      >
                        {hasStarted ? "Restart Interview" : "Start Interview"}
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    label="Your Answer"
                    placeholder={
                      hasStarted
                        ? "Type your answer to the current question here..."
                        : "Click “Start Interview” to get your first question."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={4}
                    disabled={!hasStarted || isLoading || isFinished}
                  />

                  <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Stage:{" "}
                      <span className="font-medium capitalize">{state.stage}</span>{" "}
                      • Difficulty:{" "}
                      <span className="font-medium capitalize">
                        {state.difficulty}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={!hasStarted || isLoading || isFinished}
                      >
                        {isLoading ? "Thinking..." : "Send Answer"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={isLoading && !hasStarted}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </form>

                <div className="flex-1 min-h-[260px] max-h-[520px] overflow-y-auto rounded-lg bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 text-sm">
                      <p className="font-medium">
                        Start a mock interview to see questions and feedback here.
                      </p>
                      <p className="mt-2 max-w-md">
                        The interviewer will adapt questions across OOP, OS, DBMS, CN,
                        Java coding and behavioral topics based on your answers.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${
                          m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            m.role === "user"
                              ? "bg-indigo-600 text-white rounded-br-sm"
                              : m.role === "system"
                              ? "bg-slate-100 text-gray-700 border border-slate-200 rounded-bl-sm"
                              : "bg-white text-gray-800 border border-indigo-100 rounded-bl-sm"
                          }`}
                        >
                          <div className="text-[11px] mb-1 opacity-70">
                            {m.role === "user"
                              ? "You"
                              : m.role === "system"
                              ? "System"
                              : "Interviewer"}
                            {" • "}
                            <span className="capitalize">{m.stage}</span>
                          </div>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-indigo-100 text-xs text-gray-600 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <FadeIn delay={0.15}>
              <Card className="h-full flex flex-col">
                <CardTitle>Interview Summary & Report</CardTitle>
                <CardContent className="flex-1 flex flex-col">
                  <div className="text-xs text-gray-500 mb-3">
                    At the end of the interview, a structured report will appear here
                    with score, strengths, weak areas and a hiring recommendation.
                  </div>
                  <div className="flex-1 max-h-[520px] overflow-y-auto rounded-lg bg-slate-50 p-4">
                    {summaryMarkdown ? (
                      <div className="prose prose-sm max-w-none text-gray-800">
                        {/* Render markdown very lightly to avoid extra dependency – simple pre block */}
                        <pre className="whitespace-pre-wrap bg-transparent p-0 text-sm">
                          {summaryMarkdown}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Complete the interview to generate your detailed report. Make
                        sure to answer honestly and explain your reasoning, not just the
                        final result.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </FadeIn>
      </Container>
    </Layout>
  );
}



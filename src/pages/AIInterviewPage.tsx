import React, { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Container } from "@/components/ui/layout";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea, Select, Input } from "@/components/ui/form";
import { FadeIn } from "@/components/ui/animations";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

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

const STAGE_LABELS: Record<InterviewStage, string> = {
  introduction: "Intro",
  technical: "Technical",
  coding: "Coding",
  behavioral: "Behavioral",
  summary: "Summary",
};

/** Parse interviewer message into feedback + question if it uses FEEDBACK: / QUESTION: format */
function parseInterviewerMessage(content: string): { feedback?: string; question?: string } | null {
  const hasFeedback = /FEEDBACK:/i.test(content);
  const hasQuestion = /QUESTION:/i.test(content);
  if (!hasFeedback && !hasQuestion) return null;
  const feedbackMatch = content.match(/FEEDBACK:\s*([\s\S]*?)(?=QUESTION:|$)/i);
  const questionMatch = content.match(/QUESTION:\s*([\s\S]*)$/i);
  const feedback = feedbackMatch ? feedbackMatch[1].trim() : undefined;
  const question = questionMatch ? questionMatch[1].trim() : undefined;
  if (!feedback && !question) return null;
  return { feedback: feedback || undefined, question: question || undefined };
}

/** Renders markdown-like summary (## headings, **bold**, - lists) without extra deps */
function SummaryReport({ content }: { content: string }) {
  let text = content.trim();
  text = text.replace(/^```\s*markdown?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={key++} className="text-base font-semibold text-gray-900 mt-4 mb-1 first:mt-0">
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h4 key={key++} className="text-sm font-semibold text-gray-800 mt-3 mb-1">
          {line.slice(4)}
        </h4>
      );
    } else if (/^[-*]\s/.test(line)) {
      elements.push(
        <li key={key++} className="ml-4 text-sm text-gray-700 list-disc">
          {line.replace(/^[-*]\s*/, "")}
        </li>
      );
    } else if (line.trim()) {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
      elements.push(
        <p key={key++} className="text-sm text-gray-700 mt-1">
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**") ? (
              <strong key={j} className="font-semibold text-gray-900">
                {p.slice(2, -2)}
              </strong>
            ) : (
              p
            )
          )}
        </p>
      );
    } else {
      elements.push(<div key={key++} className="h-2" />);
    }
  }
  return <div className="space-y-0">{elements}</div>;
}

/** Generate and download a note-style PDF of the report */
function downloadSummaryPdf(content: string) {
  let normalized = content.trim();
  normalized = normalized
    .replace(/^```\s*markdown?\s*\n?/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  const isLabelValue = (s: string) => /^\*\*.+\*\*:\s*.+/.test(s);
  const parseLabelValue = (s: string) => {
    const match = s.match(/^\*\*(.+?)\*\*:\s*(.*)/);
    return match ? { label: match[1], value: match[2] } : null;
  };
  const stripHeading = (s: string) => s.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const margin = 18;
  const notePadding = 14;
  const noteX = margin;
  const noteY = margin;
  const noteW = pageW - margin * 2;
  const contentX = noteX + notePadding;
  let contentY = noteY + notePadding;
  const contentW = noteW - notePadding * 2;
  const lineHeight = 6;
  const sectionGap = 5;

  // Note background: cream/off-white with light border
  doc.setFillColor(253, 252, 248);
  doc.roundedRect(noteX, noteY, noteW, pageH - margin * 2, 2, 2, "F");
  doc.setDrawColor(220, 212, 195);
  doc.setLineWidth(0.3);
  doc.roundedRect(noteX, noteY, noteW, pageH - margin * 2, 2, 2, "S");

  doc.setTextColor(31, 41, 55);
  const titleFontSize = 14;
  doc.setFontSize(titleFontSize);
  doc.setFont("helvetica", "bold");

  let firstLine = lines[0];
  const useAsTitle =
    !isLabelValue(firstLine) &&
    (firstLine.toLowerCase().includes("report") ||
      firstLine.toLowerCase().includes("evaluation") ||
      firstLine.length < 60);

  if (useAsTitle && lines.length > 1) {
    doc.text(stripHeading(firstLine), contentX, contentY);
    contentY += titleFontSize * 0.5 + sectionGap;
    // Underline
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(contentX, contentY - 2, contentX + contentW, contentY - 2);
    contentY += sectionGap;
  }

  doc.setFont("helvetica", "normal");

  const startIndex = useAsTitle && lines.length > 1 ? 1 : 0;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const pv = parseLabelValue(line);
    if (pv) {
      // Label (small, gray)
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "bold");
      doc.text(pv.label.toUpperCase(), contentX, contentY);
      contentY += lineHeight * 0.8;
      // Value (wrapped)
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "normal");
      const valueLines = doc.splitTextToSize(pv.value, contentW);
      doc.text(valueLines, contentX, contentY);
      contentY += valueLines.length * lineHeight + sectionGap;
    } else if (line.startsWith("## ") || line.startsWith("### ")) {
      contentY += sectionGap;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(stripHeading(line), contentX, contentY);
      contentY += lineHeight + sectionGap;
      doc.setFont("helvetica", "normal");
    } else if (line.trim()) {
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      const textLines = doc.splitTextToSize(line.replace(/\*\*/g, ""), contentW);
      doc.text(textLines, contentX, contentY);
      contentY += textLines.length * lineHeight + 2;
    }

    if (contentY > pageH - margin - 20) {
      doc.addPage();
      contentY = margin + notePadding;
      doc.setFillColor(253, 252, 248);
      doc.roundedRect(noteX, noteY, noteW, pageH - margin * 2, 2, 2, "F");
      doc.setDrawColor(220, 212, 195);
      doc.roundedRect(noteX, noteY, noteW, pageH - margin * 2, 2, 2, "S");
    }
  }

  const filename = `Interview-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalAnswered =
    stageCounts.introduction +
    stageCounts.technical +
    stageCounts.coding +
    stageCounts.behavioral;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

      setSummaryMarkdown(
        summaryResult.summaryMarkdown ||
          summaryResult.interviewerMessage ||
          "Report generated. Review your feedback above."
      );

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

  const handleEndInterview = async () => {
    if (!hasStarted || isFinished || isLoading || !geminiService) return;
    setIsLoading(true);
    try {
      await produceSummary({ ...state, stage: "summary" });
      showNotification({
        title: "Interview ended",
        message: "Your report has been generated.",
      });
    } catch {
      // produceSummary already shows error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <Container>
        <FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-8 items-start">
            <Card className="h-full flex flex-col">
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">
                      AI Mock Interview
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                      One question at a time · Adaptive difficulty
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {targetRole}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {preferredLanguage}
                    </span>
                  </div>
                </div>

                {hasStarted && !isFinished && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Progress</span>
                      <span>
                        Question {totalAnswered + 1} of ~{totalQuestionLimit}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {stagePlan.map((s) => (
                        <div
                          key={s}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-colors",
                            state.stage === s
                              ? "bg-indigo-500"
                              : stageCounts[s] > 0
                              ? "bg-indigo-200"
                              : "bg-gray-200"
                          )}
                          title={STAGE_LABELS[s]}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                      {stagePlan.map((s) => (
                        <span
                          key={s}
                          className={cn(
                            state.stage === s && "font-medium text-gray-600"
                          )}
                        >
                          {STAGE_LABELS[s]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <CardContent className="flex flex-col gap-4 flex-1 min-h-0">
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

                <div
                  className="flex-1 min-h-[280px] overflow-y-auto rounded-xl bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-4 space-y-4 border border-gray-100"
                  role="log"
                  aria-label="Interview messages"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[240px] text-center px-4">
                      <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-2xl mb-4">
                        💬
                      </div>
                      <p className="font-medium text-gray-700">
                        Start a mock interview to see questions and feedback here.
                      </p>
                      <p className="mt-2 text-sm text-gray-500 max-w-sm">
                        Questions cover OOP, OS, DBMS, CN, {preferredLanguage} coding,
                        and behavioral topics. Answer in full sentences for better
                        feedback.
                      </p>
                      <ul className="mt-4 text-left text-xs text-gray-500 space-y-1">
                        <li>· One question at a time</li>
                        <li>· Difficulty adapts to your answers</li>
                        <li>· Report generated at the end</li>
                      </ul>
                    </div>
                  ) : (
                    <>
                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            "flex gap-3",
                            m.role === "user" ? "flex-row-reverse" : ""
                          )}
                        >
                          {m.role !== "user" && (
                            <Avatar className="h-8 w-8 shrink-0 rounded-full bg-indigo-100 text-indigo-600">
                              <AvatarFallback className="text-xs">
                                {m.role === "system" ? "S" : "AI"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {m.role === "user" && (
                            <Avatar className="h-8 w-8 shrink-0 rounded-full bg-gray-200 text-gray-600">
                              <AvatarFallback className="text-xs">You</AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                              m.role === "user"
                                ? "bg-indigo-600 text-white rounded-br-md"
                                : m.role === "system"
                                ? "bg-slate-100 text-gray-700 border border-slate-200 rounded-bl-md"
                                : "bg-white text-gray-800 border border-indigo-100 rounded-bl-md"
                            )}
                          >
                            <div className="text-[11px] mb-1.5 opacity-80">
                              <span className="font-medium">
                                {m.role === "user"
                                  ? "You"
                                  : m.role === "system"
                                  ? "System"
                                  : "Interviewer"}
                              </span>
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/5 capitalize">
                                {m.stage}
                              </span>
                            </div>
                            <div className="leading-relaxed">
                              {m.role === "interviewer" ? (() => {
                                const parsed = parseInterviewerMessage(m.content);
                                if (parsed && (parsed.feedback || parsed.question)) {
                                  return (
                                    <div className="space-y-3 text-sm">
                                      {parsed.feedback && (
                                        <div>
                                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                            Feedback
                                          </div>
                                          <div className="text-gray-700 whitespace-pre-wrap">
                                            {parsed.feedback}
                                          </div>
                                        </div>
                                      )}
                                      {parsed.question && (
                                        <div className="pt-2 border-t border-gray-100">
                                          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                            Question
                                          </div>
                                          <div className="text-gray-800 font-medium whitespace-pre-wrap">
                                            {parsed.question}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return <div className="whitespace-pre-wrap">{m.content}</div>;
                              })() : (
                                <div className="whitespace-pre-wrap">{m.content}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0 rounded-full bg-indigo-100 text-indigo-600">
                            <AvatarFallback className="text-xs">AI</AvatarFallback>
                          </Avatar>
                          <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-indigo-100 text-xs text-gray-600 shadow-sm">
                            <span className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.2s]" />
                              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse [animation-delay:0.4s]" />
                            </span>
                            Thinking…
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-3 pt-4 border-t border-gray-200"
                >
                  <Textarea
                    label="Your Answer"
                    placeholder={
                      hasStarted
                        ? "Type your answer here… Press Enter to send, Shift+Enter for new line."
                        : "Click “Start Interview” to get your first question."
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={4}
                    disabled={!hasStarted || isLoading || isFinished}
                  />

                  <div className="flex flex-wrap gap-3 justify-between items-center">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-medium capitalize text-gray-700">
                        {state.stage}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{state.difficulty}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={!hasStarted || isLoading || isFinished}
                      >
                        {isLoading ? "Thinking…" : "Send Answer"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleEndInterview}
                        disabled={!hasStarted || isLoading || isFinished}
                      >
                        End Interview
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
              </CardContent>
            </Card>

            <FadeIn delay={0.15}>
              <Card className="h-full flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <CardTitle className="mb-0 flex items-center gap-2">
                    Interview Summary & Report
                    {isFinished && summaryMarkdown && (
                      <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    )}
                  </CardTitle>
                  {summaryMarkdown && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSummaryPdf(summaryMarkdown)}
                    >
                      Download PDF
                    </Button>
                  )}
                </div>
                <CardContent className="flex-1 flex flex-col min-h-0">
                  <div className="text-xs text-gray-500 mb-3">
                    When you finish all questions or click &quot;End Interview&quot;, a
                    structured report appears here with score, strengths, weak areas, and
                    hiring recommendation—even if you end in the middle.
                  </div>
                  <div className="flex-1 max-h-[520px] overflow-y-auto rounded-xl bg-slate-50 border border-gray-100 p-4">
                    {summaryMarkdown ? (
                      <SummaryReport content={summaryMarkdown} />
                    ) : (
                      <div className="text-sm text-gray-600 space-y-3">
                        <p>
                          Complete the interview or click &quot;End Interview&quot; to
                          generate your detailed report and feedback.
                        </p>
                        <p className="text-xs font-medium text-gray-500 pt-2">
                          Your report will include:
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1 list-none">
                          <li>Overall Score</li>
                          <li>Performance Summary</li>
                          <li>Technical Knowledge</li>
                          <li>Problem Solving</li>
                          <li>Communication Skills</li>
                          <li>Coding Quality</li>
                          <li>Strengths</li>
                          <li>Areas for Improvement</li>
                          <li>Recommended Resources</li>
                          <li>Interview Transcript</li>
                        </ul>
                        <p className="text-xs text-gray-500 pt-2">
                          Tip: Answer honestly and explain your reasoning, not just the
                          final result.
                        </p>
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



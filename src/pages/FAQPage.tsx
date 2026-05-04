import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ChevronDown,
  ChevronUp,
  MessageCircleQuestion,
  PlusCircle,
  Search,
  Sparkles,
} from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  topic: string;
  menteeId: string;
  mentorId: string;
  createdAt: any;
}

interface Topic {
  id: string;
  name: string;
}

export function FAQPage() {
  const INITIAL_VISIBLE_FAQS = 6;

  const { user } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [visibleFaqCount, setVisibleFaqCount] = useState<number>(INITIAL_VISIBLE_FAQS);

  // Fetch topics from Firestore
  useEffect(() => {
    let isMounted = true;

    const fetchTopics = async () => {
      const topicsRef = collection(db, "forumTopics");
      const snapshot = await getDocs(topicsRef);
      const fetchedTopics = snapshot.docs
        .map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        }))
        .filter((topic) => typeof topic.name === "string" && topic.name.trim()) as Topic[];

      // Merge with existing FAQ topics
      const faqTopicsRef = collection(db, "faqs");
      const faqSnapshot = await getDocs(faqTopicsRef);
      const faqTopics = Array.from(
        new Set(
          faqSnapshot.docs
            .map((doc) => doc.data().topic)
            .filter((topic) => typeof topic === "string" && topic.trim())
        )
      ).map((topic) => ({ id: topic, name: topic }));

      // Combine and filter unique topics
      const uniqueTopics = Array.from(
        new Map(
          [...fetchedTopics, ...faqTopics].map((topic) => [topic.name, topic])
        ).values()
      ).sort((a, b) => a.name.localeCompare(b.name));

      if (isMounted) {
        setTopics(uniqueTopics);
      }
    };

    fetchTopics();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch FAQs from Firestore
  useEffect(() => {
    const faqsRef = collection(db, "faqs");
    const faqQuery = selectedTopic
      ? query(faqsRef, where("topic", "==", selectedTopic))
      : query(faqsRef);

    const unsubscribe = onSnapshot(faqQuery, (snapshot) => {
      const fetchedFaqs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FAQ[];
      setFaqs(fetchedFaqs);
    });

    return () => unsubscribe();
  }, [selectedTopic]);

  const toMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    return 0;
  };

  // Filtered and searched FAQs
  const filteredFaqs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return faqs
      .filter((faq) => {
        if (!normalizedSearch) return true;

        return (
          faq.question?.toLowerCase().includes(normalizedSearch) ||
          faq.answer?.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }, [faqs, searchQuery]);

  const clearFilters = () => {
    setSelectedTopic("");
    setSearchQuery("");
  };

  const faqCountLabel = `${filteredFaqs.length} ${
    filteredFaqs.length === 1 ? "Result" : "Results"
  }`;

  const visibleFaqs = filteredFaqs.slice(0, visibleFaqCount);
  const hasMoreFaqs = filteredFaqs.length > visibleFaqCount;

  useEffect(() => {
    setVisibleFaqCount(INITIAL_VISIBLE_FAQS);
    setExpandedFaqId(null);
  }, [selectedTopic, searchQuery]);

  const toggleFaq = (faqId: string) => {
    setExpandedFaqId((prev) => (prev === faqId ? null : faqId));
  };

  // Handle adding a new FAQ
  const handleAddFaq = async () => {
    const topicName = newTopic.trim();
    const questionText = newQuestion.trim();
    const answerText = newAnswer.trim();

    if (!topicName || !questionText || !answerText || !user) return;

    const faqsRef = collection(db, "faqs");
    const topicsRef = collection(db, "forumTopics");

    try {
      await addDoc(faqsRef, {
        question: questionText,
        answer: answerText,
        topic: topicName,
        menteeId: user.uid,
        mentorId: "",
        createdAt: serverTimestamp(),
      });

      const existingTopic = topics.find(
        (topic) => topic.name.toLowerCase() === topicName.toLowerCase()
      );

      if (!existingTopic) {
        const docRef = await addDoc(topicsRef, { name: topicName });
        setTopics((prev) =>
          [...prev, { id: docRef.id, name: topicName }].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      }

      setNewQuestion("");
      setNewAnswer("");
      setNewTopic("");
    } catch (error) {
      console.error("Error adding FAQ:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <main className="flex-1 pt-24 pb-12 container mx-auto px-4">
        <section className="bg-white/90 border border-blue-100 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wide mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Knowledge Hub
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Frequently Asked Questions
              </h1>
              <p className="text-slate-600 mt-2 max-w-2xl">
                Find quick answers from the community and share new insights to help other mentees.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Topics</p>
                <p className="text-2xl font-extrabold text-blue-900 mt-1">{topics.length}</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Shown</p>
                <p className="text-2xl font-extrabold text-indigo-900 mt-1">{filteredFaqs.length}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr,auto] gap-3">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">All Topics</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.name}>
                    {topic.name}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search questions or answers"
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <Button
                variant="outline"
                onClick={clearFilters}
                className="h-11 border-slate-300 text-slate-700"
                disabled={!selectedTopic && !searchQuery.trim()}
              >
                Reset
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-1">
                Quick Topics
              </span>
              <button
                type="button"
                onClick={() => setSelectedTopic("")}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                  !selectedTopic
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-slate-600 border-slate-300 hover:border-primary/50"
                }`}
              >
                All
              </button>
              {topics.slice(0, 8).map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopic(topic.name)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                    selectedTopic === topic.name
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-slate-600 border-slate-300 hover:border-primary/50"
                  }`}
                >
                  {topic.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-900">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              <h2 className="text-lg md:text-xl font-bold">Browse Questions</h2>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">{faqCountLabel}</p>
          </div>

          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              visibleFaqs.map((faq) => {
                const isOpen = expandedFaqId === faq.id;

                return (
                  <article
                    key={faq.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 hover:border-primary/30 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full px-4 md:px-5 py-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold uppercase tracking-wide">
                            {faq.topic || "General"}
                          </span>
                          <p className="mt-2 text-base md:text-lg font-semibold text-slate-900">
                            {faq.question}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Added {faq.createdAt?.toDate?.()?.toLocaleString?.() || "just now"}
                          </p>
                        </div>
                        <span className="text-slate-500 pt-1">
                          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 md:px-5 pb-4 border-t border-slate-200">
                        <p className="mt-3 text-slate-700 leading-relaxed whitespace-pre-wrap">{faq.answer}</p>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                <p className="text-slate-700 font-semibold">No FAQs matched your filters.</p>
                <p className="text-sm text-slate-500 mt-1">Try another topic or clear the search.</p>
              </div>
            )}
          </div>

          {filteredFaqs.length > 0 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              {hasMoreFaqs && (
                <Button
                  variant="outline"
                  onClick={() => setVisibleFaqCount((prev) => prev + INITIAL_VISIBLE_FAQS)}
                  className="border-slate-300"
                >
                  Show more questions
                </Button>
              )}

              {visibleFaqCount > INITIAL_VISIBLE_FAQS && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setVisibleFaqCount(INITIAL_VISIBLE_FAQS);
                    setExpandedFaqId(null);
                  }}
                  className="text-slate-600"
                >
                  Show less
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="h-5 w-5 text-primary" />
            <h3 className="text-lg md:text-xl font-bold text-slate-900">Add a New FAQ</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Topic (for example: Resume, Projects)"
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Question"
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Answer"
            className="mt-4 min-h-32 w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-slate-500">
              {user
                ? "Your question and answer will appear for everyone in the FAQ hub."
                : "Please sign in to add a new FAQ."}
            </p>
            <Button
              onClick={handleAddFaq}
              disabled={!newQuestion.trim() || !newAnswer.trim() || !newTopic.trim() || !user}
              className="h-11 px-6"
            >
              Publish FAQ
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

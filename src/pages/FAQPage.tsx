import React, { useEffect, useState } from "react";
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
  const { user } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newTopic, setNewTopic] = useState("");

  // Fetch topics from Firestore
  useEffect(() => {
    const fetchTopics = async () => {
      const topicsRef = collection(db, "forumTopics");
      const snapshot = await getDocs(topicsRef);
      const fetchedTopics = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      })) as Topic[];

      // Merge with existing FAQ topics
      const faqTopicsRef = collection(db, "faqs");
      const faqSnapshot = await getDocs(faqTopicsRef);
      const faqTopics = Array.from(
        new Set(faqSnapshot.docs.map((doc) => doc.data().topic))
      ).map((topic) => ({ id: topic, name: topic }));

      // Combine and filter unique topics
      const uniqueTopics = Array.from(
        new Map(
          [...fetchedTopics, ...faqTopics].map((topic) => [topic.name, topic])
        ).values()
      );
      setTopics(uniqueTopics);
    };
    fetchTopics();
  }, []);

  // Fetch FAQs from Firestore
  useEffect(() => {
    const fetchFaqs = async () => {
      const faqsRef = collection(db, "faqs");
      const q = selectedTopic
        ? query(faqsRef, where("topic", "==", selectedTopic))
        : query(faqsRef);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedFaqs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as FAQ[];
        setFaqs(fetchedFaqs);
      });
      return () => unsubscribe();
    };
    fetchFaqs();
  }, [selectedTopic]);

  // Handle adding a new FAQ
  const handleAddFaq = async () => {
    if (!newQuestion.trim() || !newAnswer.trim() || !newTopic.trim() || !user) return;
    const faqsRef = collection(db, "faqs");
    const topicsRef = collection(db, "forumTopics");
    try {
      await addDoc(faqsRef, {
        question: newQuestion,
        answer: newAnswer,
        topic: newTopic,
        menteeId: user.uid,
        mentorId: "",
        createdAt: serverTimestamp(),
      });
      const existingTopic = topics.find((topic) => topic.name === newTopic);
      if (!existingTopic) {
        const docRef = await addDoc(topicsRef, { name: newTopic });
        setTopics((prev) => [...prev, { id: docRef.id, name: newTopic }]);
      }
      setNewQuestion("");
      setNewAnswer("");
      setNewTopic("");
    } catch (error) {
      console.error("Error adding FAQ:", error);
    }
  };

  // Filtered and searched FAQs
  const filteredFaqs = faqs.filter(faq =>
    (!searchQuery.trim() ||
      faq.question.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.trim().toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white">
      <Header />
      <div className="pt-24 flex-1 flex flex-col"> {/* pt-24 to ensure spacing below Header */}
        <div className="text-3xl font-extrabold text-primary text-center mb-8 drop-shadow-sm select-none tracking-tight">
          Frequently Asked Questions (FAQs)
        </div>
        {/* Topic Selection & Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 p-6 bg-gray-100 border-b items-start md:items-center">
          <div className="flex items-center gap-2 w-full md:w-fit">
            <span className="text-base font-medium text-gray-800 mr-2">Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="p-2 border rounded-md shadow-sm min-w-[180px]"
            >
              <option value="">All Topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.name}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search questions or answers..."
            className="flex-1 p-2 border rounded-md shadow-sm md:ml-6 min-w-[200px]"
          />
        </div>

        {/* FAQ List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gradient-to-br from-white to-blue-50">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <div key={faq.id} className="p-6 bg-white rounded-2xl shadow-lg border hover:shadow-2xl transition-shadow group relative">
                <div className="absolute -top-4 -left-4 bg-blue-100 text-blue-600 rounded-xl px-3 py-1 text-xs font-bold shadow group-hover:bg-blue-200">{faq.topic}</div>
                <p className="font-semibold text-lg text-blue-900">Q: <span className="font-normal text-gray-800">{faq.question}</span></p>
                <p className="mt-3 text-base text-gray-700"><span className="font-bold text-green-600">A:</span> {faq.answer}</p>
                <p className="text-xs text-gray-400 mt-4">{faq.createdAt?.toDate?.()?.toLocaleString?.()}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-10 text-lg select-none">No FAQs found with that topic or search.</p>
          )}
        </div>

        {/* Add FAQ Section */}
        <div className="p-6 bg-white border-t">
          <h3 className="text-xl font-extrabold mb-6 text-primary">Add a New FAQ</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="Topic"
              className="p-3 border rounded-md w-full shadow"
            />
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Question"
              className="p-3 border rounded-md w-full shadow"
            />
            <input
              type="text"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Answer"
              className="p-3 border rounded-md w-full shadow"
            />
          </div>
          <Button onClick={handleAddFaq} disabled={!newQuestion.trim() || !newAnswer.trim() || !newTopic.trim()} className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            Add FAQ
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
}

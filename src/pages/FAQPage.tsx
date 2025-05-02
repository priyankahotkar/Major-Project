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
      // Add the FAQ to the database
      await addDoc(faqsRef, {
        question: newQuestion,
        answer: newAnswer,
        topic: newTopic,
        menteeId: user.uid,
        mentorId: "", // This can be updated with the mentor's ID if needed
        createdAt: serverTimestamp(),
      });

      // Check if the topic already exists in the database
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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 bg-primary text-white text-center text-lg font-bold">
        Frequently Asked Questions (FAQs)
      </div>

      {/* Topic Selection */}
      <div className="p-4 bg-gray-200 border-b">
        <div className="flex items-center space-x-4">
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="p-2 border rounded-md flex-1"
          >
            <option value="">All Topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.name}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FAQ List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
        {faqs.length > 0 ? (
          faqs.map((faq) => (
            <div key={faq.id} className="p-4 bg-white rounded-lg shadow-sm border">
              <p className="font-bold">Q: {faq.question}</p>
              <p className="mt-2">A: {faq.answer}</p>
              <p className="text-xs text-gray-500 mt-2">Topic: {faq.topic}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No FAQs available for this topic</p>
        )}
      </div>

      {/* Add FAQ Section */}
      <div className="p-4 bg-white border-t">
        <h3 className="text-lg font-bold mb-4">Add a New FAQ</h3>
        <div className="space-y-4">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Topic"
            className="p-2 border rounded-md w-full"
          />
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Question"
            className="p-2 border rounded-md w-full"
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Answer"
            className="p-2 border rounded-md w-full"
          />
          <Button onClick={handleAddFaq} disabled={!newQuestion.trim() || !newAnswer.trim() || !newTopic.trim()}>
            Add FAQ
          </Button>
        </div>
      </div>
    </div>
  );
}

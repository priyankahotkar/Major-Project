import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";

interface ForumMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
}

interface ForumTopic {
  id: string;
  name: string;
}

export function DiscussionForumPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [toxicityWarning, setToxicityWarning] = useState<string | null>(null);

  // Fetch topics
  useEffect(() => {
    const fetchTopics = async () => {
      const topicsRef = collection(db, "forumTopics");
      const snapshot = await getDocs(topicsRef);
      setTopics(snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name })) as ForumTopic[]);
    };
    fetchTopics();
  }, []);

  // Fetch messages live
  useEffect(() => {
    if (!selectedTopic) return;
    const messagesRef = collection(db, "forumMessages", selectedTopic.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ForumMessage[]);
    });
    return () => unsubscribe();
  }, [selectedTopic]);

  // ✅ Perspective API Toxicity Check
  const analyzeToxicity = async (text: string): Promise<number | null> => {
    try {
      const API_KEY = "AIzaSyCbVyOfLuSULS74NmExG0EXsNh7e9oKb4s"; // Your key stays same
      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment: { text },
            languages: ["en"],
            requestedAttributes: { TOXICITY: {} },
          }),
        }
      );

      const data = await response.json();
      return data.attributeScores?.TOXICITY?.summaryScore?.value || null;
    } catch {
      return null;
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedTopic) return;

    const toxicityScore = await analyzeToxicity(newMessage);
    if (toxicityScore !== null && toxicityScore > 0.55) {
      setToxicityWarning("⚠️ Message appears toxic. Please rewrite politely.");
      return;
    }

    setToxicityWarning(null);

    await addDoc(
      collection(db, "forumMessages", selectedTopic.id, "messages"),
      {
        text: newMessage,
        senderId: user.uid,
        senderName: user.displayName || "User",
        timestamp: serverTimestamp(),
      }
    );
    setNewMessage("");
  };

  // Create topic
  const handleCreateTopic = async () => {
    if (!newTopic.trim()) return;
    const docRef = await addDoc(collection(db, "forumTopics"), { name: newTopic });
    setTopics((prev) => [...prev, { id: docRef.id, name: newTopic }]);
    setNewTopic("");
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-100 to-gray-200">

      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white text-center text-lg font-semibold shadow-md">
        Discussion Forum
      </div>

      {/* Topic Bar */}
      <div className="p-4 flex gap-3 border-b bg-white shadow-sm">
        <select
          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={selectedTopic?.id || ""}
          onChange={(e) => setSelectedTopic(topics.find(t => t.id === e.target.value) || null)}
        >
          <option value="">Select Topic</option>
          {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
        </select>

        <input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="New Topic"
          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
        />

        <Button onClick={handleCreateTopic} disabled={!newTopic.trim()}>
          Create
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {selectedTopic ? (
          messages.map((m) => {
            const isOwn = m.senderId === user?.uid;
            return (
              <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`p-3 rounded-2xl shadow-sm max-w-[70%] ${
                    isOwn
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border rounded-bl-none"
                  }`}
                >
                  <p className="font-semibold text-sm opacity-90">{m.senderName}</p>
                  <p className="mt-1">{m.text}</p>
                  <p className="text-[10px] opacity-60 mt-1">
                    {m.timestamp?.toDate?.()?.toLocaleTimeString?.()}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500">Select a topic to start chatting</p>
        )}
      </div>

      {/* Input */}
      {selectedTopic && (
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex flex-col gap-2 shadow-lg">
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 p-3 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <Button disabled={!newMessage.trim()}>Send</Button>
          </div>

          {toxicityWarning && (
            <p className="text-red-500 text-sm">{toxicityWarning}</p>
          )}
        </form>
      )}
    </div>
  );
}

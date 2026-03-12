import React, { useEffect, useState, useRef } from "react";
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
import { Header } from "@/components/layout/Header";
import { Send, MessageSquare, Plus, Hash } from "lucide-react";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create topic
  const handleCreateTopic = async () => {
    if (!newTopic.trim()) return;
    const docRef = await addDoc(collection(db, "forumTopics"), { name: newTopic });
    setTopics((prev) => [...prev, { id: docRef.id, name: newTopic }]);
    setNewTopic("");
  };

  return (
    <>
      <Header />
      <div className="flex flex-col h-screen pt-16 bg-gradient-to-br from-blue-50 to-white">
        {/* Topic Bar - Dashboard style card */}
        <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Discussion Forum</h2>
            </div>
            <div className="flex-1 flex gap-3 w-full sm:w-auto">
              <select
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <Button
                onClick={handleCreateTopic}
                disabled={!newTopic.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
        </div>

        {/* Messages - scrollable area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="container mx-auto space-y-4">
            {selectedTopic ? (
              messages.length > 0 ? (
                <>
                  {messages.map((m) => {
                    const isOwn = m.senderId === user?.uid;
                    return (
                      <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl max-w-[75%] ${
                            isOwn
                              ? "bg-blue-600 text-white rounded-br-sm shadow-md"
                              : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                          }`}
                        >
                          <p className={`text-xs font-semibold mb-1 ${isOwn ? "text-blue-200" : "text-blue-600"}`}>
                            {m.senderName}
                          </p>
                          <p className="text-sm leading-relaxed">{m.text}</p>
                          <p className={`text-[10px] mt-2 ${isOwn ? "text-blue-200" : "text-gray-400"}`}>
                            {m.timestamp?.toDate?.()?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Hash className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-semibold">No messages yet</p>
                  <p className="text-sm">Be the first to start the discussion!</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-xl font-semibold mb-2">Select a topic</p>
                <p className="text-sm">Choose a topic from above to join the discussion</p>
              </div>
            )}
          </div>
        </div>

        {/* Input - sticks to bottom */}
        {selectedTopic && (
          <div className="px-6 py-4 bg-white border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="container mx-auto flex flex-col gap-2">
              <div className="flex gap-3">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <Button
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 disabled:opacity-50 transition"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {toxicityWarning && (
                <p className="text-red-500 text-sm">{toxicityWarning}</p>
              )}
            </form>
          </div>
        )}
      </div>
    </>
  );
}

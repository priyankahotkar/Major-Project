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
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, Plus, Hash, ChevronDown, Pencil, Trash2, X } from "lucide-react";

interface ForumMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  timestamp: any;
  edited?: boolean;
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
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Delete message from Firestore
  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedTopic) return;
    try {
      await deleteDoc(doc(db, "forumMessages", selectedTopic.id, "messages", messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
    setActiveMenuId(null);
  };

  // Start editing — puts text in bottom input
  const handleStartEdit = (message: ForumMessage) => {
    setEditingMessageId(message.id);
    setNewMessage(message.text);
    setActiveMenuId(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setNewMessage("");
  };

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

  // Send Message (or save edit)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedTopic) return;

    const toxicityScore = await analyzeToxicity(newMessage);
    if (toxicityScore !== null && toxicityScore > 0.2) {
      setToxicityWarning("⚠️ Message appears toxic. Please rewrite politely.");
      return;4
    }

    setToxicityWarning(null);

    // If editing, update existing message
    if (editingMessageId) {
      try {
        await updateDoc(doc(db, "forumMessages", selectedTopic.id, "messages", editingMessageId), {
          text: newMessage.trim(),
          edited: true,
        });
      } catch (error) {
        console.error("Error editing message:", error);
      }
      setEditingMessageId(null);
      setNewMessage("");
      return;
    }

    await addDoc(
      collection(db, "forumMessages", selectedTopic.id, "messages"),
      {
        text: newMessage,
        senderId: user.uid,
        senderName: user.displayName || "User",
        senderPhoto: user.photoURL || "",
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
          <div className="container mx-auto">
            {selectedTopic ? (
              messages.length > 0 ? (
                <>
                  {messages.map((m, idx) => {
                    const isOwn = m.senderId === user?.uid;
                    // Generate a consistent color for each sender name
                    const nameColors = ["text-pink-500", "text-green-600", "text-purple-600", "text-orange-500", "text-teal-600", "text-red-500", "text-indigo-600"];
                    const colorIndex = m.senderName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % nameColors.length;
                    const nameColor = isOwn ? "text-blue-200" : nameColors[colorIndex];
                    // Hide avatar & name if same sender as previous message
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showHeader = !prevMsg || prevMsg.senderId !== m.senderId;
                    return (
                      <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showHeader ? "mt-3" : "mt-0.5"}`}>
                        {/* Avatar for received messages */}
                        {!isOwn && (
                          <div className="w-8 mr-2 flex-shrink-0">
                            {showHeader ? (
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={m.senderPhoto} alt={m.senderName} />
                                <AvatarFallback className="bg-gray-300 text-gray-700 text-xs">
                                  {m.senderName?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                            ) : <div className="w-8" />}
                          </div>
                        )}
                        <div className="relative group max-w-[85%]">
                          {/* Hover dropdown for own messages */}
                          {isOwn && (
                            <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" ref={activeMenuId === m.id ? menuRef : null}>
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === m.id ? null : m.id)}
                                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                              >
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              </button>
                              {activeMenuId === m.id && (
                                <div className="absolute left-0 top-7 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-20">
                                  <button
                                    onClick={() => handleStartEdit(m)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(m.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl ${
                              isOwn
                                ? "bg-blue-500 text-white rounded-tr-sm shadow-md"
                                : "bg-white text-gray-800 shadow-sm rounded-tl-sm"
                            }`}
                          >
                            {showHeader && (
                              <p className={`text-xs font-semibold mb-0.5 ${nameColor}`}>
                                {isOwn ? "You" : m.senderName}
                              </p>
                            )}
                            <span className="break-words text-[15px]">
                              {m.text}
                              {m.edited && (
                                <span className={`text-[10px] italic ml-1 ${
                                  isOwn ? "text-blue-200" : "text-gray-400"
                                }`}>edited</span>
                              )}
                              <span className={`inline-block align-bottom ml-2 text-[10px] leading-none translate-y-0.5 ${
                                isOwn ? "text-blue-100" : "text-gray-400"
                              }`}>
                                {m.timestamp?.toDate?.()?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </span>
                          </div>
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
              {/* Editing indicator */}
              {editingMessageId && (
                <div className="flex items-center justify-between px-2 py-1.5 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-sm text-blue-700">Editing message</span>
                  </div>
                  <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
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

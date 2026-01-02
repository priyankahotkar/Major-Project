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
  doc,
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

  // Fetch topics from Firestore
  useEffect(() => {
    const fetchTopics = async () => {
      const topicsRef = collection(db, "forumTopics");
      const snapshot = await getDocs(topicsRef);
      const fetchedTopics = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      })) as ForumTopic[];
      setTopics(fetchedTopics);
    };

    fetchTopics();
  }, []);

  // Fetch messages for the selected topic in real-time
  useEffect(() => {
    if (!selectedTopic) return;

    const messagesRef = collection(db, "forumMessages", selectedTopic.id, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ForumMessage[];
      setMessages(fetchedMessages);
    });

    return () => unsubscribe(); // Cleanup function
  }, [selectedTopic]);

  // Handle sending a new message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedTopic) return;

    const messagesRef = collection(db, "forumMessages", selectedTopic.id, "messages");

    try {
      await addDoc(messagesRef, {
        text: newMessage,
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Handle creating a new topic
  const handleCreateTopic = async () => {
    if (!newTopic.trim()) return;

    const topicsRef = collection(db, "forumTopics");

    try {
      const docRef = await addDoc(topicsRef, { name: newTopic });
      setTopics((prev) => [...prev, { id: docRef.id, name: newTopic }]);
      setNewTopic("");
    } catch (error) {
      console.error("Error creating topic:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 bg-primary text-white text-center text-lg font-bold">
        Discussion Forum
      </div>

      {/* Topic Selection */}
      <div className="p-4 bg-gray-200 border-b">
        <div className="flex items-center space-x-4">
          <select
            value={selectedTopic?.id || ""}
            onChange={(e) =>
              setSelectedTopic(topics.find((topic) => topic.id === e.target.value) || null)
            }
            className="p-2 border rounded-md flex-1"
          >
            <option value="">Select a Topic</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="New Topic"
            className="p-2 border rounded-md flex-1"
          />
          <Button onClick={handleCreateTopic} disabled={!newTopic.trim()}>
            Create
          </Button>
        </div>
      </div>

      {/* Messages Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
        {selectedTopic ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === user?.uid ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-2 rounded-lg max-w-xs ${
                  message.senderId === user?.uid
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-black"
                }`}
              >
                <p className="font-bold">{message.senderName}</p>
                <p>{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp?.toDate?.()?.toLocaleTimeString?.()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">Select a topic to view messages</p>
        )}
      </div>

      {/* Message Input */}
      {selectedTopic && (
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-md focus:outline-none"
          />
          <Button type="submit" disabled={!newMessage.trim()} className="ml-2">
            Send
          </Button>
        </form>
      )}
    </div>
  );
}

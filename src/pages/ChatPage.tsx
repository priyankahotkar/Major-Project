import React, { useEffect, useState } from "react";
import { Send, Video, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/contexts/NotificationContext";
import { auth, db, storage } from "@/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  where,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface Message {
  id: string;
  text?: string;
  senderId: string;
  timestamp: any;
  fileName?: string;
  fileURL?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  lastMessageTimestamp?: any;
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // Fetch user list and their last messages
  useEffect(() => {
    const fetchUsersWithLastMessages = async () => {
      if (!user) return;
      
      // First, fetch all users
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const usersList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as User))
        .filter((u) => u.id !== user?.uid);

      // For each user, get their last message timestamp
      const usersWithTimestamp = await Promise.all(
        usersList.map(async (u) => {
          const chatId = user.uid < u.id
            ? `${user.uid}_${u.id}`
            : `${u.id}_${user.uid}`;

          const messagesRef = collection(db, "chats", chatId, "messages");
          const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
          const messageSnap = await getDocs(q);
          
          const lastMessage = messageSnap.docs[0]?.data();
          return {
            ...u,
            lastMessageTimestamp: lastMessage?.timestamp || null
          };
        })
      );

      // Sort users by last message timestamp
      const sortedUsers = usersWithTimestamp.sort((a, b) => {
        if (!a.lastMessageTimestamp && !b.lastMessageTimestamp) return 0;
        if (!a.lastMessageTimestamp) return 1;
        if (!b.lastMessageTimestamp) return -1;
        return b.lastMessageTimestamp.seconds - a.lastMessageTimestamp.seconds;
      });

      setUsers(sortedUsers);
    };

    fetchUsersWithLastMessages();

    // Set up real-time listener for new messages to update user order
    const unsubscribeChats = onSnapshot(
      collection(db, "chats"),
      () => {
        fetchUsersWithLastMessages();
      }
    );

    return () => unsubscribeChats();
  }, [user]);

  // Fetch previous messages and listen for new messages in real-time
  useEffect(() => {
    if (!user || !selectedUser) return;

    const chatId =
      user.uid < selectedUser.id
        ? `${user.uid}_${selectedUser.id}`
        : `${selectedUser.id}_${user.uid}`;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    // Fetch previous messages
    const fetchMessages = async () => {
      const snapshot = await getDocs(q);
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(fetchedMessages);
    };

    fetchMessages();

    // Listen for new messages in real-time
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      // Check for new messages
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = change.doc.data() as Message;
          if (message.senderId !== user?.uid && selectedUser) {
            const messagePreview = message.text 
              ? (message.text.length > 50 ? message.text.substring(0, 47) + '...' : message.text)
              : message.fileName 
                ? `Sent a file: ${message.fileName}`
                : 'Sent a message';
                
            showNotification({
              title: `New message from ${selectedUser.name}`,
              message: messagePreview,
              onClick: () => {
                // Ensure the chat window is focused
                window.focus();
              }
            });
          }
        }
      });
      
      setMessages(fetchedMessages);
    });

    return () => unsubscribe(); // Cleanup function
  }, [selectedUser, user]); // Runs when `selectedUser` or `user` changes

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;

    const chatId =
      user.uid < selectedUser.id
        ? `${user.uid}_${selectedUser.id}`
        : `${selectedUser.id}_${user.uid}`;

    const messagesRef = collection(db, "chats", chatId, "messages");

    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      participants: [user.uid, selectedUser.id], // Add participants to the message
      timestamp: serverTimestamp(),
    });

    setNewMessage("");
  };

  const handleFileUpload = async (file: File) => {
    if (!file || !user || !selectedUser) return;

    const chatId =
      user.uid < selectedUser.id
        ? `${user.uid}_${selectedUser.id}`
        : `${selectedUser.id}_${user.uid}`;

    const fileRef = ref(storage, `chats/${chatId}/${file.name}`);

    try {
      // Upload file to Firebase Storage
      await uploadBytes(fileRef, file);

      // Get the download URL
      const fileURL = await getDownloadURL(fileRef);

      // Save the file message in Firestore
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        senderId: user.uid,
        fileName: file.name,
        fileURL,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar: User List */}
      <div className="w-1/4 bg-gray-200 p-4 border-r">
        <h2 className="text-lg font-bold mb-3">Recent Chats</h2>
        <ul>
          {users.map((u) => (
            <li
              key={u.id}
              className={`p-2 flex items-center space-x-2 cursor-pointer rounded-lg ${
                selectedUser?.id === u.id ? "bg-blue-300" : "hover:bg-gray-300"
              }`}
              onClick={() => setSelectedUser(u)}
            >
              <img src={u.photoURL} alt={u.name} className="w-8 h-8 rounded-full" />
              <div className="flex flex-col">
                <span>{u.name}</span>
                {u.lastMessageTimestamp && (
                  <span className="text-xs text-gray-500">
                    {new Date(u.lastMessageTimestamp.toDate()).toLocaleString()}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Section */}
      <div className="w-3/4 flex flex-col bg-gray-100">
        {/* Chat Header */}
        <div className="p-4 bg-primary text-white flex justify-between items-center">
          <div className="text-lg font-bold">
            {selectedUser ? `Chat with ${selectedUser.name}` : "Select a user to chat"}
          </div>
          {selectedUser && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const chatId = user?.uid && selectedUser.id ? 
                    (user.uid < selectedUser.id ? 
                      `${user.uid}_${selectedUser.id}` : 
                      `${selectedUser.id}_${user.uid}`) : 
                    '';
                  navigate(`/video-call/${chatId}`);
                }}
                className="bg-blue-500 hover:bg-blue-600"
                size="sm"
              >
                <Video className="h-4 w-4 mr-2" />
                Video Call
              </Button>
              <Button
                onClick={() => {
                  const chatId = user?.uid && selectedUser.id ? 
                    (user.uid < selectedUser.id ? 
                      `${user.uid}_${selectedUser.id}` : 
                      `${selectedUser.id}_${user.uid}`) : 
                    '';
                  navigate(`/voice-call/${chatId}`);
                }}
                className="bg-green-500 hover:bg-green-600"
                size="sm"
              >
                <Phone className="h-4 w-4 mr-2" />
                Voice Call
              </Button>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedUser ? (
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
                  {message.text && <p>{message.text}</p>}
                  {message.fileURL && (
                    <a
                      href={message.fileURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      {message.fileName}
                    </a>
                  )}
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp?.toDate?.()?.toLocaleTimeString?.()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">Select a user to start chatting</p>
          )}
        </div>

        {/* Message Input */}
        {selectedUser && (
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded-md focus:outline-none"
            />
            <Button type="submit" disabled={!newMessage.trim()} className="ml-2">
              <Send className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files) handleFileUpload(e.target.files[0]);
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-gray-200 p-2 rounded hover:bg-gray-300"
              >
                Upload File
              </label>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

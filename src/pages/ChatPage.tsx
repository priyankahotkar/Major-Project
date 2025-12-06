import React, { useEffect, useState } from "react";
import { Send, Video, Phone, MessageSquare, Paperclip, Users, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Header } from '@/components/layout/Header';

interface Message {
  id: string;
  text?: string;
  senderId: string;
  timestamp: any;
  fileName?: string;
  fileURL?: string;
  isRead?: boolean;
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
          const isRead = message.isRead || false;
          
          // Only show notification for unread messages from someone else
          if (message.senderId !== user?.uid && !isRead && selectedUser) {
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

    return () => {
      unsubscribe();
    };
  }, [selectedUser, user, showNotification]); // Runs when `selectedUser` or `user` changes

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
      isRead: true, // Sender's own messages are always read
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
        isRead: true, // Sender's own file messages are always read
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <>
      <Header />
      <div className="flex h-[calc(100vh-4rem)] pt-16">
        {/* Sidebar: User List */}
        <div className="w-1/3 md:w-1/4 bg-white border-r border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-800">Messages</h2>
            </div>
            <p className="text-sm text-gray-600">{users.length} conversations</p>
          </div>
          <div className="overflow-y-auto h-[calc(100vh-13rem)]">
            {users.length > 0 ? (
              <ul className="p-2">
                {users.map((u) => (
                  <li
                    key={u.id}
                    className={`p-3 flex items-center gap-3 cursor-pointer rounded-lg mb-1 transition-all ${
                      selectedUser?.id === u.id 
                        ? "bg-blue-500 text-white shadow-md" 
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={u.photoURL} alt={u.name || 'User'} />
                      <AvatarFallback className={selectedUser?.id === u.id ? "bg-blue-400" : "bg-gray-300"}>
                        {u.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{u.name || 'Unknown User'}</div>
                      {u.lastMessageTimestamp && (
                        <div className={`text-xs mt-0.5 ${selectedUser?.id === u.id ? "text-blue-100" : "text-gray-500"}`}>
                          {new Date(u.lastMessageTimestamp.toDate()).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Users className="w-16 h-16 mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
          {/* Chat Header */}
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              {selectedUser && (
                <Avatar className="w-10 h-10 border-2 border-white">
                  <AvatarImage src={selectedUser.photoURL} alt={selectedUser.name || 'User'} />
                  <AvatarFallback className="bg-blue-400">{selectedUser.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <div className="text-lg font-bold">
                  {selectedUser ? selectedUser.name || 'Unknown User' : "Select a user to chat"}
                </div>
                {selectedUser && (
                  <div className="text-sm text-blue-100 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    Active now
                  </div>
                )}
              </div>
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
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  size="sm"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
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
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  size="sm"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Voice
                </Button>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {selectedUser ? (
              messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${
                      message.senderId === user?.uid ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.senderId !== user?.uid && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={selectedUser.photoURL} alt={selectedUser.name || 'User'} />
                        <AvatarFallback className="bg-gray-400 text-white text-xs">
                          {selectedUser.name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col max-w-xs md:max-w-md">
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          message.senderId === user?.uid
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md"
                            : "bg-white text-gray-800 shadow-sm"
                        }`}
                      >
                        {message.text && <p className="break-words">{message.text}</p>}
                        {message.fileURL && (
                          <a
                            href={message.fileURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 mt-1 ${
                              message.senderId === user?.uid ? "text-blue-100" : "text-blue-600"
                            } hover:underline`}
                          >
                            <Paperclip className="w-3 h-3" />
                            {message.fileName}
                          </a>
                        )}
                      </div>
                      <p className={`text-xs mt-1 px-1 ${
                        message.senderId === user?.uid ? "text-right text-gray-600" : "text-gray-500"
                      }`}>
                        {message.timestamp?.toDate?.()?.toLocaleTimeString?.()}
                      </p>
                    </div>
                    {message.senderId === user?.uid && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'You'} />
                        <AvatarFallback className="bg-blue-400 text-white text-xs">
                          {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Hash className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg">No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-20 h-20 mb-4 opacity-30" />
                <p className="text-xl font-semibold mb-2">Select a user to start chatting</p>
                <p className="text-sm">Choose a conversation from the sidebar</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          {selectedUser && (
            <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
                  className="cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-gray-600 hover:text-blue-600" />
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
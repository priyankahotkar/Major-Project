import React, { useEffect, useState, useRef } from "react";
import { Send, Video, Phone, MessageSquare, Paperclip, Users, Hash, Search, X, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
// Notifications are handled globally by src/components/Notifications.tsx
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
  updateDoc,
  deleteDoc,
  doc,
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
  edited?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  role?: string;
  lastMessageTimestamp?: any;
  lastMessage?: string;
  unreadCount?: number;
}

export function ChatPage() {
  // Format timestamp like WhatsApp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.toDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (msgDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [user] = useAuthState(auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const navigate = useNavigate();
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

  // Get chatId helper
  const getChatId = () => {
    if (!user || !selectedUser) return "";
    return user.uid < selectedUser.id
      ? `${user.uid}_${selectedUser.id}`
      : `${selectedUser.id}_${user.uid}`;
  };

  // Delete message from Firestore
  const handleDeleteMessage = async (messageId: string) => {
    const chatId = getChatId();
    if (!chatId) return;
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
    setActiveMenuId(null);
  };

  // Start editing a message — puts text in the bottom input box
  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setNewMessage(message.text || "");
    setActiveMenuId(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setNewMessage("");
  };

  // Fetch user list and their last messages
  useEffect(() => {
    const fetchUsersWithLastMessages = async () => {
      if (!user) return;
      
      // Fetch all users
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const usersList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as User))
        .filter((u) => u.id !== user?.uid);

      // For each user, get their last message timestamp and unread count
      const usersWithTimestamp = await Promise.all(
        usersList.map(async (u) => {
          const chatId = user.uid < u.id
            ? `${user.uid}_${u.id}`
            : `${u.id}_${user.uid}`;

          const messagesRef = collection(db, "chats", chatId, "messages");
          const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
          const messageSnap = await getDocs(q);
          
          const lastMessage = messageSnap.docs[0]?.data();
          
          // Get all messages and count unread
          const allMessagesSnap = await getDocs(
            collection(db, "chats", chatId, "messages")
          );
          let unreadCount = 0;
          allMessagesSnap.docs.forEach((docSnap) => {
            const msgData = docSnap.data();
            // Count messages from other user that current user hasn't read
            if (msgData.senderId !== user.uid) {
              const readBy = msgData.readBy || [];
              if (!readBy.includes(user.uid)) {
                unreadCount++;
              }
            }
          });

          return {
            ...u,
            lastMessageTimestamp: lastMessage?.timestamp || null,
            lastMessage: lastMessage?.text || "",
            unreadCount: unreadCount,
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
      setFilteredUsers(sortedUsers);
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

  // Filter users based on search query and role filter
  useEffect(() => {
    let filtered = users;

    // Apply role filter
    if (roleFilter) {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((u) =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, users, roleFilter]);

  // Fetch previous messages and listen for new messages in real-time
  useEffect(() => {
    if (!user || !selectedUser) return;

    const chatId =
      user.uid < selectedUser.id
        ? `${user.uid}_${selectedUser.id}`
        : `${selectedUser.id}_${user.uid}`;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    // Use a ref to ignore the initial snapshot so we don't treat existing messages as "new"
    let initialSnapshot = true;

    // Listen for new messages in real-time
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      // Mark all unread messages from others as read when user views the chat
      snapshot.docs.forEach(async (docSnap) => {
        const messageData = docSnap.data();
        // Only mark messages from others as read
        if (messageData.senderId !== user.uid) {
          const readBy = messageData.readBy || [];
          if (!readBy.includes(user.uid)) {
            try {
              await updateDoc(docSnap.ref, {
                readBy: [...readBy, user.uid]
              });
            } catch (error) {
              console.error('Error marking message as read:', error);
            }
          }
        }
      });

      // On the very first snapshot we get the existing messages; skip notifications for these
      if (initialSnapshot) {
        initialSnapshot = false;
        setMessages(fetchedMessages);
        // Scroll to bottom after initial load
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
        return;
      }

      // For subsequent snapshots we simply update the message list; global Notifications component
      // will handle popup toasts for unread messages across chats.
      setMessages(fetchedMessages);
      // Scroll to bottom when new messages arrive
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    });

    return () => unsubscribe();
  }, [selectedUser, user]); // Runs when `selectedUser` or `user` changes

  // Send Message (or save edit)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedUser) return;

    const chatId =
      user.uid < selectedUser.id
        ? `${user.uid}_${selectedUser.id}`
        : `${selectedUser.id}_${user.uid}`;

    // If editing, update existing message
    if (editingMessageId) {
      try {
        await updateDoc(doc(db, "chats", chatId, "messages", editingMessageId), {
          text: newMessage.trim(),
          edited: true,
        });
      } catch (error) {
        console.error("Error editing message:", error);
      }
      setEditingMessageId(null);
      setNewMessage("");
      setIsTyping(false);
      return;
    }

    const messagesRef = collection(db, "chats", chatId, "messages");

    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      participants: [user.uid, selectedUser.id],
      timestamp: serverTimestamp(),
      readBy: [user.uid],
    });

    setNewMessage("");
    setIsTyping(false);
  };

  // Handle typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
    } else if (e.target.value.length === 0 && isTyping) {
      setIsTyping(false);
    }
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
        <div className="w-1/3 md:w-1/4 bg-white border-r border-gray-200 flex flex-col shadow-sm">
          {/* Header with icon */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-lg font-bold text-gray-800">Messages</h2>
                <p className="text-xs text-gray-500">{filteredUsers.length} conversations</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Role Filter Tags */}
            <div className="flex gap-2">
              <button
                onClick={() => setRoleFilter(null)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  roleFilter === null
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRoleFilter("mentee")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  roleFilter === "mentee"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                Mentee
              </button>
              <button
                onClick={() => setRoleFilter("mentor")}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  roleFilter === "mentor"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                Mentor
              </button>
            </div>
          </div>

          {/* User List */}
          <div className="overflow-y-auto flex-1">
            {filteredUsers.length > 0 ? (
              <ul className="p-2">
                {filteredUsers.map((u) => (
                  <li
                    key={u.id}
                    className={`p-3 flex items-center gap-3 cursor-pointer rounded-lg mb-1 transition-all ${
                      selectedUser?.id === u.id 
                        ? "bg-blue-100" 
                        : "hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedUser(u)}
                  >
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={u.photoURL} alt={u.name || 'User'} />
                      <AvatarFallback className={selectedUser?.id === u.id ? "bg-blue-400" : "bg-gray-300"}>
                        {u.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800 truncate text-sm">{u.name || 'Unknown User'}</span>
                        {/* WhatsApp style timestamp */}
                        {u.lastMessageTimestamp && (
                          <span className={`text-xs whitespace-nowrap ml-2 ${selectedUser?.id === u.id ? "text-blue-700" : "text-gray-500"}`}>
                            {formatTimestamp(u.lastMessageTimestamp)}
                          </span>
                        )}
                      </div>
                      {/* Last Message Preview */}
                      {u.lastMessage && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{u.lastMessage}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                {searchQuery ? (
                  <>
                    <Search className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-sm">No conversations found</p>
                  </>
                ) : (
                  <>
                    <Users className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-sm">No conversations yet</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b border-gray-200 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3">
              {selectedUser && (
                <>
                  <Avatar className="w-10 h-10 border-2 border-blue-500">
                    <AvatarImage src={selectedUser.photoURL} alt={selectedUser.name || 'User'} />
                    <AvatarFallback className="bg-blue-400 text-white">{selectedUser.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-gray-900">
                        {selectedUser ? selectedUser.name || 'Unknown User' : "Select a user to chat"}
                      </p>
                    </div>
                    {selectedUser && (
                      <p className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedUser && (
                <>
                  <Button
                    onClick={() => {
                      const chatId = user?.uid && selectedUser.id ? 
                        (user.uid < selectedUser.id ? 
                          `${user.uid}_${selectedUser.id}` : 
                          `${selectedUser.id}_${user.uid}`) : 
                        '';
                      navigate(`/video-call/${chatId}`);
                    }}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-0"
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
                    className="bg-green-100 hover:bg-green-200 text-green-700 border-0"
                    size="sm"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Voice
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {selectedUser ? (
              messages.length > 0 ? (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === user?.uid ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className="max-w-md md:max-w-xl relative group">
                        {/* Hover dropdown icon */}
                        {message.senderId === user?.uid && !editingMessageId && (
                          <div className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" ref={activeMenuId === message.id ? menuRef : null}>
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === message.id ? null : message.id)}
                              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                            >
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            </button>
                            {/* Dropdown menu */}
                            {activeMenuId === message.id && (
                              <div className="absolute left-0 top-7 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[120px] z-20">
                                {message.text && (
                                  <button
                                    onClick={() => handleStartEdit(message)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteMessage(message.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message bubble */}
                        <div
                          className={`px-3 py-1.5 ${
                            message.senderId === user?.uid
                              ? "bg-blue-500 text-white rounded-2xl rounded-tr-sm"
                              : "bg-white text-gray-800 shadow-sm rounded-2xl rounded-tl-sm"
                          }`}
                        >
                          {message.text && (
                            <span className="break-words text-[15px]">
                              {message.text}
                              {message.edited && (
                                <span className={`text-[10px] italic ml-1 ${
                                  message.senderId === user?.uid ? "text-blue-200" : "text-gray-400"
                                }`}>edited</span>
                              )}
                              <span className={`inline-block align-bottom ml-2 text-[10px] leading-none translate-y-0.5 ${
                                message.senderId === user?.uid ? "text-blue-100" : "text-gray-400"
                              }`}>
                                {message.timestamp?.toDate?.()?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </span>
                          )}
                          {message.fileURL && (
                            <a
                              href={message.fileURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 mt-1 text-sm ${
                                message.senderId === user?.uid ? "text-blue-100" : "text-blue-600"
                              } hover:underline`}
                            >
                              <Paperclip className="w-3 h-3" />
                              {message.fileName}
                            </a>
                          )}
                          {!message.text && (
                            <span className={`text-[10px] float-right mt-1 ${
                              message.senderId === user?.uid ? "text-blue-100" : "text-gray-400"
                            }`}>
                              {message.timestamp?.toDate?.()?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
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
            <div className="bg-white border-t border-gray-200 p-4">
              {/* Editing indicator */}
              {editingMessageId && (
                <div className="flex items-center justify-between mb-2 px-2 py-1.5 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-sm text-blue-700">Editing message</span>
                  </div>
                  <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
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
                  <Paperclip className="w-5 h-5 text-gray-500 hover:text-blue-600" />
                </label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
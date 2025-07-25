import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { gapi } from "gapi-script";

const CLIENT_ID = "http://527398753279-nndtd0p6tpiq5ebobefqui0m0nv95d8u.apps.googleusercontent.com";
const API_KEY = "AIzaSyAy5GNcNhMLAXfADgWawJZquo5HE7tA3MU";
const SCOPES = "https://www.googleapis.com/auth/drive.file";

const ChatBox: React.FC<{ selectedUserId: string }> = ({ selectedUserId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user || !selectedUserId) return;

    const chatId = user && user.uid < selectedUserId ? `${user.uid}_${selectedUserId}` : `${selectedUserId}_${user?.uid}`;
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [user, selectedUserId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !file) return;

    const chatId = user && user.uid < selectedUserId ? `${user.uid}_${selectedUserId}` : `${selectedUserId}_${user?.uid}`;
    const messagesRef = collection(db, "chats", chatId, "messages");

    if (newMessage.trim()) {
      await addDoc(messagesRef, {
        senderId: user?.uid || "unknown",
        text: newMessage,
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    }

    if (file) {
      await handleFileUpload(file, chatId);
      setFile(null);
    }
  };

  const handleFileUpload = async (file: File, chatId: string) => {
    try {
      gapi.load("client:auth2", async () => {
        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES,
        });

        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance.isSignedIn.get()) {
          await authInstance.signIn();
        }

        const accessToken = gapi.auth.getToken().access_token;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("uploadType", "multipart");
        formData.append("name", file.name);

        const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const fileData = await response.json();

        await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        });

        const shareableLink = `https://drive.google.com/file/d/${fileData.id}/view`;

        const messagesRef = collection(db, "chats", chatId, "messages");
        await addDoc(messagesRef, {
          senderId: user?.uid || "unknown",
          fileName: file.name,
          fileLink: shareableLink,
          timestamp: serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div>
      <div>
        {messages.map((message) => (
          <div key={message.id}>
            {message.text && <p>{message.text}</p>}
            {message.fileLink && (
              <a href={message.fileLink} target="_blank" rel="noopener noreferrer">
                {message.fileName}
              </a>
            )}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};

export default ChatBox;

import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  message: string;
  createdAt: any;
}

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    // Derive notifications from unread chat messages directly
    const chatIdsRef = collection(db, 'chats');
    const unsubscribeChats = onSnapshot(chatIdsRef, (chatsSnapshot) => {
      // For each chat the user is a participant in
      const userChats = chatsSnapshot.docs.filter(chatDoc => chatDoc.id.includes(user.uid));
      const messageUnsubscribes: Array<() => void> = [];
      let allNotifications: Notification[] = [];
      // For each chat, get the lastSeen value for this user
      for (const chatDoc of userChats) {
        const messagesRef = collection(db, 'chats', chatDoc.id, 'messages');
        const q = query(messagesRef);
        // Get lastSeen value from chatDoc
        const lastSeen = (chatDoc.data().lastSeen && chatDoc.data().lastSeen[user.uid]) || 0;
        const messageUnsubscribe = onSnapshot(q, (msgSnapshot) => {
          let collectedNotifications: Notification[] = [];
          msgSnapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (
              data.senderId !== user.uid &&
              (!data.readBy || !data.readBy.includes(user.uid)) &&
              data.timestamp && data.timestamp.seconds > lastSeen
            ) {
              collectedNotifications.push({
                id: docSnap.id,
                message: data.text || (data.fileName ? `Sent a file: ${data.fileName}` : 'New message'),
                createdAt: data.timestamp,
              });
            }
          });
          allNotifications = [...allNotifications, ...collectedNotifications];
          setNotifications([...allNotifications]);
        });
        messageUnsubscribes.push(messageUnsubscribe);
      }
      return () => messageUnsubscribes.forEach(unsub => unsub());
    });
    return () => unsubscribeChats();
  }, [user]);

  if (!user) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Notifications</h2>
      {notifications.length === 0 ? (
        <p className="text-gray-500">No new notifications</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`p-2 rounded-lg bg-blue-100`}
            >
              <p>{notification.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;

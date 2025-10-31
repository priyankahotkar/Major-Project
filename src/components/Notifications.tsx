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

    const chatIdsRef = collection(db, 'chats');
    const unsubscribeChats = onSnapshot(chatIdsRef, (chatsSnapshot) => {
      const userChats = chatsSnapshot.docs.filter(chatDoc => chatDoc.id.includes(user.uid));
      const messageUnsubscribes: Array<() => void> = [];
      let allNotifications: Notification[] = [];

      for (const chatDoc of userChats) {
        const messagesRef = collection(db, 'chats', chatDoc.id, 'messages');
        const q = query(messagesRef);

        const lastSeen = (chatDoc.data().lastSeen && chatDoc.data().lastSeen[user.uid]) || 0;

        const messageUnsubscribe = onSnapshot(q, (msgSnapshot) => {
          const collected = msgSnapshot.docs
            .filter(docSnap => {
              const data = docSnap.data();
              return (
                data.senderId !== user.uid &&
                (!data.readBy || !data.readBy.includes(user.uid)) &&
                data.timestamp?.seconds > lastSeen
              );
            })
            .map(docSnap => ({
              id: docSnap.id,
              message: docSnap.data().text || `Sent a file`,
              createdAt: docSnap.data().timestamp,
            }));

          allNotifications = [...collected];
          setNotifications(allNotifications);
        });

        messageUnsubscribes.push(messageUnsubscribe);
      }

      return () => messageUnsubscribes.forEach(unsub => unsub());
    });

    return () => unsubscribeChats();
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-3">
      {notifications.length === 0 ? (
        <div className="border p-4 rounded-xl text-center text-gray-500 bg-gray-50">
          No new notifications
        </div>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className="p-3 rounded-xl bg-blue-100 border border-blue-300 text-blue-900 shadow-sm"
          >
            {notification.message}
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications;

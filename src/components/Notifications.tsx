import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { markSingleMessageAsRead } from "@/utils/firestoreChat";
import { X } from "lucide-react";

interface Notification {
  id: string; // composite key: `${chatId}_${msgId}`
  message: string;
  createdAt: any;
  chatId: string;
  messageId: string;
}

// Global state to track when chats are being viewed
let viewingChatId: string | null = null;

export const setViewingChat = (chatId: string | null) => {
  viewingChatId = chatId;
  console.log("[Notifications] ViewingChat updated to:", chatId);
};

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const mountTimeRef = React.useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    // Reset mount time each time effect runs (to avoid stale listeners)
    mountTimeRef.current = Date.now();
    console.log("[Notifications] Component effect running at:", new Date(mountTimeRef.current).toISOString());

    // Map of compositeKey -> Notification
    const notificationsMap = new Map<string, Notification>();
    // Map chatId -> unsubscribe
    const messageUnsubscribes = new Map<string, () => void>();

    const chatsRef = collection(db, "chats");
    const unsubscribeChats = onSnapshot(chatsRef, (chatsSnapshot) => {
      console.log("[Notifications] Chats snapshot received at:", new Date().toISOString());
      const userChats = chatsSnapshot.docs.filter((chatDoc) => chatDoc.id.includes(user.uid));
      console.log("[Notifications] User chats count:", userChats.length);
      const currentChatIds = new Set(userChats.map((d) => d.id));

      // Unsubscribe from chats that no longer apply
      for (const [chatId, unsub] of Array.from(messageUnsubscribes.entries())) {
        if (!currentChatIds.has(chatId)) {
          console.log("[Notifications] Unsubscribing from chat:", chatId);
          try { unsub(); } catch (e) {}
          messageUnsubscribes.delete(chatId);
          // remove any notifications from that chat
          for (const key of Array.from(notificationsMap.keys())) {
            if (key.startsWith(chatId + "_")) notificationsMap.delete(key);
          }
        }
      }

      // Ensure listeners exist for current user chats
      for (const chatDoc of userChats) {
        const chatId = chatDoc.id;

        if (messageUnsubscribes.has(chatId)) {
          console.log("[Notifications] Listener already exists for chat:", chatId);
          continue;
        }

        console.log("[Notifications] Setting up NEW message listener for chat:", chatId);

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef);

        const unsub = onSnapshot(q, (msgSnapshot) => {
          console.log("[Notifications] Message snapshot received for", chatId, "at:", new Date().toISOString(), "- docs count:", msgSnapshot.docs.length);
          const presentKeys = new Set<string>();

          msgSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const msgId = docSnap.id;
            const key = `${chatId}_${msgId}`;
            presentKeys.add(key);

            const senderId = data.senderId;
            const readBy: string[] = data.readBy || [];

            // Skip notifications for the chat currently being viewed
            if (chatId === viewingChatId) {
              console.log(`[Notifications] Skipping message ${msgId} - currently viewing this chat`);
              if (notificationsMap.has(key)) notificationsMap.delete(key);
              return;
            }

            // Only show notification if message is from someone else AND not yet read by current user
            const isUnread = senderId !== user.uid && !readBy.includes(user.uid);

            if (isUnread) {
              console.log(`[Notifications] Message ${msgId} is UNREAD - adding to notifications`);
              notificationsMap.set(key, {
                id: key,
                message: data.text || "Sent a file",
                createdAt: data.timestamp,
                chatId,
                messageId: msgId,
              });
            } else {
              console.log(`[Notifications] Message ${msgId} is READ - removing from notifications`);
              if (notificationsMap.has(key)) notificationsMap.delete(key);
            }
          });

          // Remove notifications for messages deleted from this snapshot
          for (const key of Array.from(notificationsMap.keys())) {
            if (key.startsWith(chatId + "_") && !presentKeys.has(key)) {
              console.log(`[Notifications] Message ${key} no longer in snapshot - removing`);
              notificationsMap.delete(key);
            }
          }

          // Update state from map, sorted by time desc
          const arr = Array.from(notificationsMap.values()).sort((a, b) => {
            const ta = a.createdAt?.seconds ?? a.createdAt?._seconds ?? 0;
            const tb = b.createdAt?.seconds ?? b.createdAt?._seconds ?? 0;
            return tb - ta;
          });
          console.log("[Notifications] Total unread notifications:", arr.length, arr.map(n => `${n.chatId}_${n.messageId}`));
          setNotifications(arr);
        });

        messageUnsubscribes.set(chatId, unsub);
      }
    });

    return () => {
      console.log("[Notifications] Cleaning up listeners");
      try { unsubscribeChats(); } catch (e) {}
      for (const unsub of Array.from(messageUnsubscribes.values())) {
        try { unsub(); } catch (e) {}
      }
      notificationsMap.clear();
      setNotifications([]);
    };
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
            className="p-3 rounded-xl bg-blue-100 border border-blue-300 text-blue-900 shadow-sm flex items-start justify-between gap-2"
          >
            <p className="flex-1">{notification.message}</p>
            <button
              onClick={() => markSingleMessageAsRead(notification.chatId, notification.messageId, user!.uid)}
              className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
              title="Mark as read"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default Notifications;

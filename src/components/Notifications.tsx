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

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    console.log("[Notifications] Setting up listeners for user:", user.uid);

    // Map of compositeKey -> Notification
    const notificationsMap = new Map<string, Notification>();
    // Map chatId -> unsubscribe
    const messageUnsubscribes = new Map<string, () => void>();

    const chatsRef = collection(db, "chats");
    const unsubscribeChats = onSnapshot(chatsRef, (chatsSnapshot) => {
      console.log("[Notifications] Chats snapshot received");
      const userChats = chatsSnapshot.docs.filter((chatDoc) => chatDoc.id.includes(user.uid));
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
          continue;
        }

        console.log("[Notifications] Setting up message listener for chat:", chatId);

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef);

        const unsub = onSnapshot(q, (msgSnapshot) => {
          console.log("[Notifications] Message snapshot for", chatId, "- docs count:", msgSnapshot.docs.length);
          const presentKeys = new Set<string>();

          msgSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const msgId = docSnap.id;
            const key = `${chatId}_${msgId}`;
            presentKeys.add(key);

            const senderId = data.senderId;
            const isRead = data.isRead === true; // Must be explicitly true, not undefined
            const isSentByCurrentUser = senderId === user.uid;

            // Only show notification if:
            // 1. Message is from someone else (not current user)
            // 2. Message is explicitly marked as unread (isRead === false, not undefined)
            const isUnread = !isSentByCurrentUser && !isRead;

            console.log(`[Notifications] Message ${msgId}: senderId=${senderId}, isRead=${isRead}, isSentByCurrentUser=${isSentByCurrentUser}, isUnread=${isUnread}`);

            if (isUnread) {
              console.log(`[Notifications] Message ${msgId} - ADDING to notifications`);
              notificationsMap.set(key, {
                id: key,
                message: data.text || "Sent a file",
                createdAt: data.timestamp,
                chatId,
                messageId: msgId,
              });
            } else {
              console.log(`[Notifications] Message ${msgId} - REMOVING from notifications (read or from self)`);
              if (notificationsMap.has(key)) notificationsMap.delete(key);
            }
          });

          // Remove notifications for messages deleted from this snapshot
          for (const key of Array.from(notificationsMap.keys())) {
            if (key.startsWith(chatId + "_") && !presentKeys.has(key)) {
              console.log(`[Notifications] Message ${key} - no longer in snapshot, removing`);
              notificationsMap.delete(key);
            }
          }

          // Update state from map, sorted by time desc
          const arr = Array.from(notificationsMap.values()).sort((a, b) => {
            const ta = a.createdAt?.seconds ?? a.createdAt?._seconds ?? 0;
            const tb = b.createdAt?.seconds ?? b.createdAt?._seconds ?? 0;
            return tb - ta;
          });
          console.log("[Notifications] Total unread notifications:", arr.length);
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
              onClick={async () => {
                console.log("[Notifications] Dismissing notification:", {
                  chatId: notification.chatId,
                  messageId: notification.messageId,
                });
                try {
                  await markSingleMessageAsRead(notification.chatId, notification.messageId);
                  console.log("[Notifications] Successfully marked as read");
                } catch (error) {
                  console.error("[Notifications] Error marking as read:", error);
                }
              }}
              className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
              title="Dismiss"
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

import React, { useEffect } from "react";
import { db } from "@/firebase";
import { collection, query, onSnapshot, collectionGroup } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { markSingleMessageAsRead } from "@/utils/firestoreChat";
import { useNotification } from "@/contexts/NotificationContext";
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
  const { showNotification } = useNotification();
  console.log('[Notifications] render - user:', user?.uid, 'showNotification:', typeof showNotification);

  useEffect(() => {
    if (!user) {
      console.log('[Notifications] useEffect - no user, exiting');
      return;
    }

    console.log("[Notifications] Setting up listeners for user:", user.uid, 'showNotificationExists:', typeof showNotification === 'function');

    // Map of compositeKey -> Notification
    const notificationsMap = new Map<string, Notification>(); // Map of compositeKey -> Notification (used to avoid duplicate popups)
    // Map chatId -> unsubscribe
    const messageUnsubscribes = new Map<string, () => void>();

    // Listen to all 'messages' subcollections across the DB and filter by chatId containing the user
    const messagesGroup = collectionGroup(db, "messages");
    const q = query(messagesGroup);
    const unsubscribeMsgs = onSnapshot(q, (snapshot) => {
      console.log("[Notifications] collectionGroup(messages) snapshot received - docCount:", snapshot.docs.length);
      // Process only document changes (avoid showing popups for existing docs on initial load)
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;

        const docSnap = change.doc;
        const data = docSnap.data() as any;
        // Determine parent chat id from the document reference path
        const chatRef = docSnap.ref.parent.parent;
        const chatId = chatRef?.id;
        if (!chatId) {
          console.log('[Notifications] skipped message - no parent chat id', docSnap.id);
          return;
        }

        // Only care about chats that include this user in their id
        if (!chatId.includes(user.uid)) return;

        const msgId = docSnap.id;
        const key = `${chatId}_${msgId}`;

        const senderId = data.senderId;
        const isRead = data.isRead === true;
        const isSentByCurrentUser = senderId === user.uid;
        const isUnread = !isSentByCurrentUser && !isRead;

        console.log(`[Notifications] change.added message ${msgId} in chat ${chatId}: sender=${senderId}, isRead=${isRead}, isUnread=${isUnread}`);

        if (isUnread) {
          if (!notificationsMap.has(key)) {
            const notificationObj = {
              id: key,
              message: data.text || 'Sent a file',
              createdAt: data.timestamp,
              chatId,
              messageId: msgId,
            } as Notification;
            notificationsMap.set(key, notificationObj);
            try {
              console.log('[Notifications] calling showNotification for', key);
              showNotification({
                title: `New message`,
                message: notificationObj.message,
                onClick: () => window.focus(),
                onClose: async () => {
                  try {
                    await markSingleMessageAsRead(chatId, msgId);
                    console.log('[Notifications] markSingleMessageAsRead called from popup onClose', key);
                  } catch (e) {
                    console.error('[Notifications] Error marking message read from popup onClose', e);
                  }
                },
              });
            } catch (e) {
              console.error('[Notifications] Error calling showNotification', e);
            }
          }
        }
      });

    });

    // store unsubscribe to allow cleanup
    const unsubscribe = () => {
      console.log('[Notifications] Cleaning up listeners');
      try { unsubscribeMsgs(); } catch (e) {}
      notificationsMap.clear();
    };

    return unsubscribe;
  }, [user]);

  if (!user) return null;

  // This component only listens and triggers toast popups via NotificationContext.
  // No in-page UI is rendered here.
  return null;
};

export default Notifications;

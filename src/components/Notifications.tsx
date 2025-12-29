import React, { useEffect } from "react";
import { db } from "@/firebase";
import { query, onSnapshot, collectionGroup, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { markSingleMessageAsRead } from "@/utils/firestoreChat";
import { useNotification } from "@/contexts/NotificationContext";

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
            
            // Fetch sender info and show notification
            (async () => {
              try {
                // Get sender's info - users are stored with document ID = uid
                const userDocRef = doc(db, "users", senderId);
                const userDocSnap = await getDoc(userDocRef);
                const senderInfo = userDocSnap.exists() ? userDocSnap.data() : null;
                
                // Try multiple possible name fields
                const senderName = senderInfo?.name || 
                                  senderInfo?.displayName || 
                                  senderInfo?.details?.fullName ||
                                  `User ${senderId.substring(0, 6)}` ||
                                  'Someone';
                
                const content = notificationObj.message;
                const previewText = content.length > 50 ? content.substring(0, 47) + '...' : content;
                
                console.log('[Notifications] calling showNotification for', key);
                showNotification({
                  title: `New message from ${senderName}`,
                  message: `${senderName}: ${previewText}`,
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
                console.error('[Notifications] Error fetching sender info or calling showNotification', e);
                // Fallback notification
                showNotification({
                  title: 'New message',
                  message: `Someone: ${notificationObj.message}`,
                  onClick: () => window.focus(),
                  onClose: async () => {
                    try {
                      await markSingleMessageAsRead(chatId, msgId);
                    } catch (err) {
                      console.error('[Notifications] Error marking message read', err);
                    }
                  },
                });
              }
            })();
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

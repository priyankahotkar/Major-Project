import React, { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

export const NotificationListener: React.FC = () => {
  const [user] = useAuthState(auth);
  const { showNotification } = useNotification();
  
  // Listen for all chats involving the current user
  useEffect(() => {
    if (!user) return;

    const unsubscribers: Array<() => void> = [];
    const processedMessages = new Set<string>();
    const chatListeners = new Map<string, () => void>();

    // Get all chats where the user is a participant
    const chatsRef = collection(db, "chats");
    
    const unsubscribeFromChats = onSnapshot(chatsRef, async (snapshot) => {
      const chatIds = snapshot.docs
        .map(doc => doc.id)
        .filter(id => id.includes(user.uid));

      // Remove listeners for chats that no longer exist
      chatListeners.forEach((unsubscribe, chatId) => {
        if (!chatIds.includes(chatId)) {
          unsubscribe();
          chatListeners.delete(chatId);
        }
      });

      // Set up listeners for messages in each chat
      chatIds.forEach(chatId => {
        // Skip if listener already exists for this chat
        if (chatListeners.has(chatId)) return;

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("timestamp", "desc"));

        let isInitialLoad = true;

        const unsubscribe = onSnapshot(q, async (messagesSnapshot) => {
          // Skip initial snapshot - only process new messages after initial load
          if (isInitialLoad) {
            isInitialLoad = false;
            return;
          }

          for (const change of messagesSnapshot.docChanges()) {
            // Only process newly added messages
            if (change.type === 'added') {
              const messageData = change.doc.data();
              const messageId = change.doc.id;
              const messageTimestamp = messageData.timestamp?.toMillis?.() || Date.now();

              // Create unique key for this message
              const messageKey = `${chatId}_${messageId}_${messageTimestamp}`;

              // Skip if we've already processed this message (within this session)
              if (processedMessages.has(messageKey)) continue;
              processedMessages.add(messageKey);

              // Simple logic: Only show popup if message is unread and from others
              const isUnread = !messageData.readBy || !messageData.readBy.includes(user.uid);
              const isFromOthers = messageData.senderId && messageData.senderId !== user.uid;

              if (isUnread && isFromOthers) {
                // Use IIFE to handle async properly
                (async () => {
                  try {
                    // Get sender's info - users are stored with document ID = uid
                    const userDocRef = doc(db, "users", messageData.senderId);
                    const userDocSnap = await getDoc(userDocRef);
                    const senderInfo = userDocSnap.exists() ? userDocSnap.data() : null;

                    // Try multiple possible name fields
                    let senderName = 'Someone';
                    if (senderInfo) {
                      senderName = senderInfo.name || 
                                   senderInfo.displayName || 
                                   senderInfo.details?.fullName ||
                                   `User ${messageData.senderId.substring(0, 6)}` ||
                                   'Someone';
                    } else {
                      senderName = `User ${messageData.senderId.substring(0, 6)}`;
                    }
                    
                    const content = messageData.text || (messageData.fileName ? 'Sent a file' : 'New message');
                    const previewText = content.length > 50 ? content.substring(0, 47) + '...' : content;
                    
                    showNotification({
                      title: `New message from ${senderName}`,
                      message: `${senderName}: ${previewText}`,
                    });
                  } catch (error) {
                    console.error('Error fetching sender info:', error);
                    // Fallback notification even if error occurs
                    const content = messageData.text || (messageData.fileName ? 'Sent a file' : 'New message');
                    const previewText = content.length > 50 ? content.substring(0, 47) + '...' : content;
                    
                    showNotification({
                      title: 'New message',
                      message: `Someone: ${previewText}`,
                    });
                  }
                })();
              }
            }
          }
        });

        chatListeners.set(chatId, unsubscribe);
        unsubscribers.push(unsubscribe);
      });
    });

    unsubscribers.push(unsubscribeFromChats);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      chatListeners.clear();
    };
  }, [user, showNotification]);

  return null;
};
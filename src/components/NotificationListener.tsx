import React, { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, query, onSnapshot, orderBy, getDocs, where, limit } from 'firebase/firestore';
import { useNotification } from '../contexts/NotificationContext';

export const NotificationListener: React.FC = () => {
  const [user] = useAuthState(auth);
  const { showNotification } = useNotification();
  
  // Listen for all chats involving the current user
  useEffect(() => {
    if (!user) return;

    const unsubscribers: Array<() => void> = [];
    const processedMessages = new Set<string>();

    // Get all chats where the user is a participant
    const chatsRef = collection(db, "chats");
    
    const unsubscribeFromChats = onSnapshot(chatsRef, async (snapshot) => {
      const chatIds = snapshot.docs
        .map(doc => doc.id)
        .filter(id => id.includes(user.uid));

      // Set up listeners for messages in each chat
      chatIds.forEach(chatId => {
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));

        const unsubscribe = onSnapshot(q, async (messagesSnapshot) => {
          for (const change of messagesSnapshot.docChanges()) {
            // Only process new messages
            if (change.type === 'added') {
              const messageData = change.doc.data();
              const messageId = change.doc.id;

              // Skip if we've already processed this message
              if (processedMessages.has(messageId)) continue;
              processedMessages.add(messageId);

              // Only show notification for messages from others
              if (messageData.senderId && messageData.senderId !== user.uid) {
                try {
                  // Get sender's info
                  const userDoc = await getDocs(
                    query(collection(db, "users"), where("uid", "==", messageData.senderId))
                  );
                  const senderInfo = userDoc.docs[0]?.data();

                  if (senderInfo) {
                    const content = messageData.text || (messageData.fileName ? 'Sent a file' : 'New message');
                    const previewText = content.length > 50 ? content.substring(0, 47) + '...' : content;
                    
                    console.log('Showing notification for message:', {
                      sender: senderInfo.name,
                      content: previewText
                    }); // Debug log
                    
                    showNotification(
                      `${senderInfo.name}: ${previewText}`,
                      'info'
                    );
                  }
                } catch (error) {
                  console.error('Error fetching sender info:', error);
                }
              }
            }
          }
        });

        unsubscribers.push(unsubscribe);
      });
    });

    unsubscribers.push(unsubscribeFromChats);

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user, showNotification]);

  return null;
};
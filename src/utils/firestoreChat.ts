import { db, storage } from "../firebase";
import { doc, updateDoc, arrayUnion, Timestamp, setDoc, getDoc, onSnapshot, collection, addDoc, query, orderBy, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Sends a message to Firestore
 */
export const sendMessage = async (chatId: string, senderId: string, recipientId: string, message: string) => {
  const chatRef = doc(db, "chats", chatId);

  try {
    await setDoc(chatRef, { lastUpdated: Timestamp.now() }, { merge: true });

    const messagesRef = collection(db, "chats", chatId, "messages");
    await addDoc(messagesRef, {
      senderId,
      text: message,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

/**
 * Listens for new messages in a chat
 */
export const listenToMessages = (chatId: string, callback: (messages: any[]) => void) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc")); // Removed unnecessary filtering

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const fetchedMessages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(fetchedMessages);
  });

  return unsubscribe;
};

/**
 * Fetches existing messages from a chat
 */
export const getChatMessages = async (chatId: string) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return [];
  }
};

const handleFileUpload = async (file: File, senderId: string, receiverId: string) => {
  if (!file) return;

  const chatId = senderId < receiverId ? `${senderId}_${receiverId}` : `${receiverId}_${senderId}`;
  const fileRef = ref(storage, `chats/${chatId}/${file.name}`);

  try {
    // Upload file to Firebase Storage
    await uploadBytes(fileRef, file);

    // Get the download URL
    const fileURL = await getDownloadURL(fileRef);

    // Save the file message in Firestore
    const messagesRef = collection(db, "chats", chatId, "messages");
    await addDoc(messagesRef, {
      senderId,
      receiverId,
      fileName: file.name,
      fileURL,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error uploading file:", error);
  }
};

export default handleFileUpload;

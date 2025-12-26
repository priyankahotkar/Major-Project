# MentorConnect (BeaconBond) - Complete Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Structure (Firestore)](#database-structure-firestore)
4. [Authentication System](#authentication-system)
5. [Roadmap Generation System](#roadmap-generation-system)
6. [Notification System](#notification-system)
7. [Chat System](#chat-system)
8. [Booking System](#booking-system)
9. [Video/Voice Call System](#videovoice-call-system)
10. [Discussion Forum](#discussion-forum)
11. [FAQ System](#faq-system)
12. [File Structure](#file-structure)

---

## System Architecture

### Overview
MentorConnect is a **full-stack web application** built as a **Single Page Application (SPA)** using React and Firebase. It connects mentors and mentees for learning sessions, discussions, and personalized guidance.

### Architecture Pattern
- **Frontend**: React 18+ with TypeScript
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Real-time Communication**: Firebase Realtime Listeners (onSnapshot)
- **Video/Audio**: Jitsi Meet SDK
- **AI Integration**: Google Gemini API for roadmap generation
- **State Management**: React Context API

### Key Design Patterns
- **Context API**: Global state (Auth, Notifications, Theme)
- **Component Composition**: Reusable UI components
- **Real-time Listeners**: Firestore onSnapshot for live updates
- **Protected Routes**: Role-based access control

---

## Technology Stack

### Frontend
- **React 18+**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **Framer Motion**: Animations
- **React Markdown**: Markdown rendering

### Backend & Services
- **Firebase Authentication**: Google OAuth, Email/Password
- **Cloud Firestore**: NoSQL database
- **Firebase Storage**: File storage
- **Google Gemini API**: AI-powered roadmap generation
- **Jitsi Meet SDK**: Video/voice conferencing
- **Perspective API**: Toxicity detection (Discussion Forum)

### External APIs
- **GitHub API**: Fetch user repositories and activity
- **LeetCode API**: Fetch user statistics
- **Codeforces API**: Fetch contest ratings and problems

---

## Database Structure (Firestore)

### Collections Overview

#### 1. `users` Collection
```typescript
{
  uid: string,                    // Firebase Auth UID
  name: string,
  email: string,
  photoURL: string,
  role: "mentor" | "mentee",      // User role
  createdAt: Timestamp,
  details: {
    domain: string,
    experience: string,
    expertise: string,
    availableTimeSlots: string[], // For mentors
    rating: number,                // Average rating
    ratings: number[]               // Array of individual ratings
  }
}
```

#### 2. `chats` Collection
```typescript
// Document ID: `${uid1}_${uid2}` (sorted alphabetically)
{
  lastSeen: {
    [userId]: number              // Timestamp in seconds
  },
  lastUpdated: Timestamp
}

// Subcollection: `messages`
{
  senderId: string,
  text?: string,
  fileName?: string,
  fileLink?: string,
  timestamp: Timestamp,
  readBy: string[],              // Array of user UIDs who read this
  participants: string[]          // Chat participants
}
```

#### 3. `bookings` Collection
```typescript
{
  mentorId: string,
  menteeId: string,
  mentorName: string,
  menteeName: string,
  menteePhotoURL: string,
  menteeDomain: string,
  date: Timestamp,
  timeSlot: string,              // e.g., "09:00", "10:00"
  status: "pending" | "confirmed" | "completed" | "cancelled"
}
```

#### 4. `videoRooms` Collection
```typescript
{
  roomId: string,                // Jitsi room ID
  mentorId: string,
  mentorName: string,
  createdAt: Timestamp,
  attended: boolean,
  status: "ongoing" | "attended" | "missed"
}
```

#### 5. `forumTopics` Collection
```typescript
{
  name: string                   // Topic name
}
```

#### 6. `forumMessages` Collection
```typescript
// Subcollection: `{topicId}/messages`
{
  text: string,
  senderId: string,
  senderName: string,
  timestamp: Timestamp
}
```

#### 7. `faqs` Collection
```typescript
{
  question: string,
  answer: string,
  topic: string,
  menteeId: string,
  mentorId: string,
  createdAt: Timestamp
}
```

---

## Authentication System

### Flow Diagram
```
User → Google OAuth / Email-Password → Firebase Auth → User Document Created → Role Selection → Dashboard
```

### Implementation Details

**File**: `src/contexts/AuthContext.tsx`

#### Key Functions:
1. **Sign In with Google**
   - Uses Firebase `signInWithPopup`
   - Checks if user is new (`isNewUser`)
   - Creates user document in Firestore if new
   - Redirects to role selection if role not set

2. **Email/Password Authentication**
   - `signInWithEmail`: Existing users
   - `registerWithEmail`: New users with role selection

3. **Role Management**
   - Role stored in Firestore `users` collection
   - Role-based routing:
     - `mentor` → `/mentor-dashboard`
     - `mentee` → `/dashboard`

4. **Session Persistence**
   - Uses `onAuthStateChanged` listener
   - Automatically fetches user role on auth state change
   - Maintains session across page refreshes

### Protected Routes
```typescript
// src/App.tsx
<PrivateRoute> // Checks if user is authenticated
  <RoleBasedDashboard /> // Routes based on role
</PrivateRoute>
```

---

## Roadmap Generation System

### Overview
AI-powered personalized learning roadmap using Google Gemini API, analyzing user profiles from GitHub, LeetCode, and Codeforces.

### Architecture

**File**: `src/services/gemini.ts`

#### Process Flow:
```
User Input (GitHub, LeetCode, Codeforces usernames + Goal + Duration)
    ↓
Fetch Data from APIs (Parallel)
    ├─ GitHub API → Repos, Activity, Languages
    ├─ LeetCode API → Problems Solved, Ranking
    └─ Codeforces API → Rating, Contests, Problems
    ↓
Build Prompt with User Data
    ↓
Send to Gemini AI Model (gemini-2.5-flash)
    ↓
Generate Markdown Roadmap
    ↓
Display to User
```

### Implementation Details

#### 1. Data Fetching
```typescript
// GitHub Data
- User profile: public_repos, followers
- Repositories: languages, stars
- Recent events: activity timeline

// LeetCode Data
- Ranking, reputation
- Problems solved by difficulty (Easy, Medium, Hard)

// Codeforces Data
- Current rating, max rating, rank
- Contests participated
- Problems solved count
```

#### 2. Prompt Engineering
The prompt includes:
- User's current skill assessment
- Goals and duration
- Platform-specific metrics
- Request for:
  - Weekly breakdown
  - Practice problems recommendations
  - Project suggestions
  - Learning resources
  - Milestones

#### 3. Response Format
- Returns markdown-formatted roadmap
- Rendered using `react-markdown`
- Includes sections, subsections, and formatting

### API Configuration
```typescript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
```

---

## Notification System

### Architecture Overview

The notification system has **two components**:

1. **NotificationListener** (`src/components/NotificationListener.tsx`)
   - Listens for new unread messages
   - Shows popup notifications in top-right

2. **Notifications Component** (`src/components/Notifications.tsx`)
   - Displays list of unread messages
   - Filters by `lastSeen` timestamp

### Notification Flow

```
New Message Created
    ↓
Firestore Listener Detects Change
    ↓
Check: Is message unread? (readBy doesn't include user.uid)
    ↓
YES → Fetch Sender Info → Show Popup Notification
NO → Skip
    ↓
User Opens Chat
    ↓
Mark All Messages as Read (update readBy array)
    ↓
Notifications Disappear
```

### Implementation Details

#### 1. Real-time Listener Setup
```typescript
// Listen to all chats user participates in
const chatsRef = collection(db, "chats");
onSnapshot(chatsRef, (snapshot) => {
  // Filter chats containing user.uid
  const chatIds = snapshot.docs
    .filter(doc => doc.id.includes(user.uid));
  
  // Set up message listeners for each chat
  chatIds.forEach(chatId => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"));
    
    onSnapshot(q, (messagesSnapshot) => {
      // Process new messages
    });
  });
});
```

#### 2. Unread Detection Logic
```typescript
const isUnread = !messageData.readBy || 
                 !messageData.readBy.includes(user.uid);
const isFromOthers = messageData.senderId !== user.uid;

if (isUnread && isFromOthers) {
  // Show notification
}
```

#### 3. Marking Messages as Read
```typescript
// When user opens chat (ChatPage.tsx)
snapshot.docs.forEach(async (docSnap) => {
  const messageData = docSnap.data();
  if (messageData.senderId !== user.uid) {
    const readBy = messageData.readBy || [];
    if (!readBy.includes(user.uid)) {
      await updateDoc(docSnap.ref, {
        readBy: [...readBy, user.uid]
      });
    }
  }
});
```

#### 4. Notification Display
- **Popup Notifications**: Top-right corner, auto-dismiss after 5 seconds
- **Notification List**: Shows all unread messages filtered by `lastSeen`
- **Position**: Fixed positioning with z-index for visibility

### Key Features
- ✅ Only shows notifications for **unread** messages
- ✅ Prevents duplicate notifications (tracks processed messages)
- ✅ Skips initial snapshot (doesn't notify for old messages)
- ✅ Real-time updates (no page refresh needed)
- ✅ Cross-device synchronization (Firestore-based)

---

## Chat System

### Architecture

**File**: `src/pages/ChatPage.tsx`

### Chat Structure
```
chats/{chatId}/messages/{messageId}
```

**Chat ID Format**: `${uid1}_${uid2}` (sorted alphabetically)

### Features

#### 1. Real-time Messaging
- Uses Firestore `onSnapshot` for live updates
- Messages ordered by `timestamp` ascending
- Auto-scroll to bottom on new messages

#### 2. File Sharing
- Files uploaded to Firebase Storage
- Stored in `chats/{chatId}/{fileName}`
- Download URL stored in message document

#### 3. Read Receipts
- `readBy` array tracks who read each message
- Automatically marked as read when chat is opened
- Used for notification filtering

#### 4. Message Structure
```typescript
{
  senderId: string,
  text?: string,
  fileName?: string,
  fileLink?: string,
  timestamp: Timestamp,
  readBy: string[],
  participants: string[]
}
```

### Implementation Flow

```
User Selects Chat Partner
    ↓
Generate Chat ID (sorted UIDs)
    ↓
Listen to Messages Collection
    ↓
Display Messages in Real-time
    ↓
Mark Messages as Read (if from others)
    ↓
Send New Message
    ↓
Update Firestore
    ↓
Listener Updates UI Automatically
```

---

## Booking System

### Architecture

**File**: `src/pages/BookingPage.tsx`

### Booking Flow

```
Mentee Searches Mentors
    ↓
Selects Mentor
    ↓
Chooses Date & Time Slot
    ↓
Creates Booking Document
    ↓
Mentor Sees Booking in Dashboard
    ↓
Session Scheduled
```

### Features

#### 1. Mentor Discovery
- Filter by domain, expertise
- Search by name
- Display ratings and availability

#### 2. Time Slot Management
- Mentors set available time slots
- Stored in `users/{mentorId}/details/availableTimeSlots`
- Displayed as checkboxes for selection

#### 3. Booking Creation
```typescript
await addDoc(collection(db, "bookings"), {
  mentorId: string,
  menteeId: string,
  mentorName: string,
  menteeName: string,
  date: Timestamp,
  timeSlot: string,
  status: "pending"
});
```

#### 4. Rating System
- Mentees can rate mentors after sessions
- Ratings stored as array: `ratings: [4, 5, 5, 4]`
- Average calculated: `averageRating = sum(ratings) / length`
- Displayed as "Most Frequent Rating"

### Meeting Status Management
- **Ongoing**: Meetings scheduled for today
- **Attended**: Completed meetings
- **Missed**: Past meetings not attended

---

## Video/Voice Call System

### Architecture

**File**: `src/components/JitsiMeet.tsx`, `src/pages/VideoCallPage.tsx`

### Implementation

#### 1. Room Creation
```typescript
// Mentor creates room
const roomId = `mentor-room-${uuidv4()}`;
await setDoc(doc(db, "videoRooms", roomId), {
  mentorId: user.uid,
  mentorName: user.displayName,
  createdAt: serverTimestamp()
});

// Navigate to call page
navigate(`/video-call/${roomId}`);
```

#### 2. Jitsi Integration
- Uses `@jitsi/react-sdk`
- Embedded iframe for video/audio
- Configurable for video-only or voice-only

#### 3. Room Configuration
```typescript
configOverwrite={{
  startWithAudioMuted: true,
  startWithVideoMuted: true,
  disableVideo: isVoiceOnly,  // For voice calls
  toolbarButtons: [...]
}}
```

#### 4. Meeting Tracking
- Room created in `videoRooms` collection
- Status updated: `ongoing`, `attended`, `missed`
- Attendance tracked for analytics

---

## Discussion Forum

### Architecture

**File**: `src/pages/DiscussionForumPage.tsx`

### Structure
```
forumTopics/{topicId}
forumMessages/{topicId}/messages/{messageId}
```

### Features

#### 1. Topic Management
- Users can create new topics
- Topics stored in `forumTopics` collection
- Topic selection filters messages

#### 2. Real-time Messaging
- Messages displayed in real-time using `onSnapshot`
- Ordered by timestamp
- Shows sender name and timestamp

#### 3. Toxicity Detection
- Uses Google Perspective API
- Analyzes message before posting
- Blocks messages with toxicity score > 0.55
- Shows warning to user

```typescript
const toxicityScore = await analyzeToxicity(newMessage);
if (toxicityScore > 0.55) {
  setToxicityWarning("⚠️ Message appears toxic.");
  return;
}
```

#### 4. Message Structure
```typescript
{
  text: string,
  senderId: string,
  senderName: string,
  timestamp: Timestamp
}
```

---

## FAQ System

### Architecture

**File**: `src/pages/FAQPage.tsx`

### Features

#### 1. FAQ Management
- Users can add FAQs with question, answer, topic
- FAQs stored in `faqs` collection
- Topics auto-created if new

#### 2. Search & Filter
- **Topic Filter**: Dropdown to filter by topic
- **Keyword Search**: Client-side search in questions/answers
- Real-time filtering as user types

#### 3. Topic Extraction
- Topics extracted from existing FAQs
- Merged with `forumTopics` collection
- Unique topics displayed in dropdown

#### 4. FAQ Structure
```typescript
{
  question: string,
  answer: string,
  topic: string,
  menteeId: string,
  mentorId: string,
  createdAt: Timestamp
}
```

---

## File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx          # Navigation header
│   │   ├── Footer.tsx          # Footer component
│   │   └── Layout.tsx          # Layout wrapper
│   ├── ui/                     # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── notification.tsx    # Notification popup UI
│   │   └── ...
│   ├── NotificationListener.tsx # Listens for new messages
│   ├── Notifications.tsx        # Notification list component
│   ├── ChatBox.tsx             # Chat component
│   └── JitsiMeet.tsx           # Video/voice call component
│
├── contexts/
│   ├── AuthContext.tsx         # Authentication state
│   ├── NotificationContext.tsx # Notification state
│   └── ThemeContext.tsx        # Theme state
│
├── pages/
│   ├── LandingPage.tsx         # Homepage
│   ├── AuthPage.tsx            # Login/Register
│   ├── DashboardPage.tsx       # Mentee dashboard
│   ├── MentorDashboard.tsx     # Mentor dashboard
│   ├── ChatPage.tsx            # Chat interface
│   ├── BookingPage.tsx         # Booking system
│   ├── RoadmapPage.tsx         # Roadmap generation
│   ├── DiscussionForumPage.tsx # Forum
│   ├── FAQPage.tsx             # FAQs
│   ├── VideoCallPage.tsx       # Video calls
│   └── VoiceCallPage.tsx       # Voice calls
│
├── services/
│   ├── auth.tsx                # Auth service functions
│   └── gemini.ts               # Gemini API service
│
├── firebase.ts                 # Firebase configuration
├── App.tsx                     # Main app component & routing
└── main.tsx                    # Entry point
```

---

## Key Technical Decisions

### 1. Why Firestore?
- **Real-time updates**: Built-in listeners
- **NoSQL flexibility**: Easy schema changes
- **Scalability**: Handles growth automatically
- **Offline support**: Works offline with sync

### 2. Why React Context over Redux?
- **Simplicity**: Less boilerplate
- **Built-in**: No extra dependencies
- **Sufficient**: App state is manageable
- **Performance**: Not a bottleneck

### 3. Why Jitsi Meet?
- **Self-hosted option**: Can be self-hosted
- **No backend needed**: Peer-to-peer communication
- **Feature-rich**: Screen sharing, recording, etc.
- **Free tier**: Good for MVP

### 4. Why Gemini AI?
- **Free tier**: Generous free usage
- **Quality**: Good for structured content
- **Easy integration**: Simple API
- **Fast**: Quick response times

---

## Security Considerations

### 1. Authentication
- Firebase Auth handles security
- Protected routes prevent unauthorized access
- Role-based access control

### 2. Firestore Rules
- Should implement security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.participants;
    }
  }
}
```

### 3. API Keys
- Stored in environment variables
- Never committed to repository
- Use `.env` file (gitignored)

---

## Performance Optimizations

### 1. Real-time Listeners
- Cleanup on unmount prevents memory leaks
- Limit queries (e.g., `limit(1)` for latest message)
- Use indexes for complex queries

### 2. Component Optimization
- React.memo for expensive components
- useCallback for event handlers
- Lazy loading for routes

### 3. Firestore Queries
- Use indexes for compound queries
- Pagination for large datasets
- Cache frequently accessed data

---

## Future Enhancements

### Potential Improvements
1. **Push Notifications**: Browser push API for offline notifications
2. **Message Encryption**: End-to-end encryption for privacy
3. **Video Recording**: Record sessions for later review
4. **Analytics Dashboard**: Track learning progress
5. **Mobile App**: React Native version
6. **Payment Integration**: Paid mentorship sessions
7. **AI Chatbot**: Automated responses using Gemini
8. **Calendar Integration**: Google Calendar sync

---

## Conclusion

MentorConnect is a **modern, scalable platform** built with:
- **React** for interactive UI
- **Firebase** for backend infrastructure
- **Real-time** communication throughout
- **AI-powered** personalization
- **Clean architecture** for maintainability

The system is designed to be:
- ✅ **Scalable**: Handles growth
- ✅ **Real-time**: Live updates everywhere
- ✅ **User-friendly**: Intuitive interface
- ✅ **Secure**: Firebase security
- ✅ **Maintainable**: Clean code structure

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Technical Documentation


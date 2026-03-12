import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import FillDetails from "./pages/FillDetails";  
import { DashboardPage } from "./pages/DashboardPage";
import { BookingPage } from "./pages/BookingPage";
import { ChatPage } from "./pages/ChatPage";
import { VideoCallPage } from "./pages/VideoCallPage";
import { VoiceCallPage } from "./pages/VoiceCallPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import Notifications from "./components/Notifications";
import { v4 as uuidv4 } from "uuid";
import { MentorDashboardPage } from "./pages/MentorDashboard"; // Import MentorDashboard
import { DiscussionForumPage } from "./pages/DiscussionForumPage"; // Import the new page
import { FAQPage } from "./pages/FAQPage"; // Import the FAQ page
import { AboutPage } from "./pages/AboutPage";
import { RoadmapPage } from "./pages/RoadmapPage";
import { AIInterviewPage } from "./pages/AIInterviewPage";
import { AttendanceLeaderboard } from "./components/AttendanceLeaderboard";
import { ActivityProgressTracker } from "./components/ActivityProgressTracker";
import { Layout } from "./components/layout/Layout";
import Chatbot from "./components/Chatbot";

// ✅ Private route protection (only for authenticated users)
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

// ✅ Role-based redirection
const RoleBasedDashboard: React.FC = () => {
  const { role } = useAuth();
  if (role === "mentor") {
    return <MentorDashboardPage />;
  }
  return <DashboardPage />;
};

// ✅ Dashboard with Video Call Start Button
const DashboardWithVideoCall: React.FC = () => {
  const navigate = useNavigate();
  const startVideoCall = () => {
    const sessionId = uuidv4();
    navigate(`/video-call/${sessionId}`);
  };

  return (
    <DashboardPage>
      <button
        className="bg-blue-500 text-white px-4 py-2 mt-4 rounded hover:bg-blue-600 transition duration-300"
        onClick={startVideoCall}
      >
        Start Video Call
      </button>
    </DashboardPage>
  );
};

// ✅ Leaderboard Page Wrapper
const LeaderboardPageWrapper: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="container mx-auto px-4 pt-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Attendance Leaderboard</h1>
            <p className="text-gray-600">
              See who's leading in attendance across our mentorship community
            </p>
          </div>
          <AttendanceLeaderboard />
        </div>
      </div>
    </Layout>
  );
};

// ✅ Progress Tracker Page Wrapper
const ProgressTrackerPageWrapper: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="container mx-auto px-4 pt-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Activity Progress</h1>
            <p className="text-gray-600">
              Track your engagement and see how you compare with other users
            </p>
          </div>
          <ActivityProgressTracker />
        </div>
      </div>
    </Layout>
  );
};

// ✅ Main App Component with correct structure
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          {/* Global notifications listener (shows popups for unread messages) */}
          <Notifications />
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/FillDetails/:role" element={<FillDetails />} />
          <Route path="/FillDetails" element={<Navigate to="/auth" replace />} />
          <Route path="/dashboard" element={<PrivateRoute><RoleBasedDashboard /></PrivateRoute>} />
          <Route path="/mentor-dashboard" element={<PrivateRoute><MentorDashboardPage /></PrivateRoute>} />
          <Route path="/booking" element={<PrivateRoute><BookingPage /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/video-call/:sessionId" element={<PrivateRoute><VideoCallPage /></PrivateRoute>} />
          <Route path="/voice-call/:sessionId" element={<PrivateRoute><VoiceCallPage /></PrivateRoute>} />
          <Route path="/discussion-forum" element={<PrivateRoute><DiscussionForumPage /></PrivateRoute>} />
          <Route path="/faq" element={<PrivateRoute><FAQPage /></PrivateRoute>} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/roadmap" element={<PrivateRoute><RoadmapPage /></PrivateRoute>} />
          <Route path="/ai-interview" element={<PrivateRoute><AIInterviewPage /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPageWrapper /></PrivateRoute>} />
          <Route path="/progress" element={<PrivateRoute><ProgressTrackerPageWrapper /></PrivateRoute>} />
          </Routes>
          <Chatbot />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;

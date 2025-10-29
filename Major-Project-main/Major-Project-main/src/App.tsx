import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import FillDetails from "./pages/FillDetails";  
import { DashboardPage } from "./pages/DashboardPage";
import { BookingPage } from "./pages/BookingPage";
import { ChatPage } from "./pages/ChatPage";
import { VideoCallPage } from "./pages/VideoCallPage";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { MentorDashboardPage } from "./pages/MentorDashboard"; // Import MentorDashboard
import { DiscussionForumPage } from "./pages/DiscussionForumPage"; // Import the new page
import { FAQPage } from "./pages/FAQPage"; // Import the FAQ page
import { AboutPage } from "./pages/AboutPage";

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

// ✅ Main App Component with correct structure
const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
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
          <Route path="/discussion-forum" element={<PrivateRoute><DiscussionForumPage /></PrivateRoute>} />
          <Route path="/faq" element={<PrivateRoute><FAQPage /></PrivateRoute>} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;

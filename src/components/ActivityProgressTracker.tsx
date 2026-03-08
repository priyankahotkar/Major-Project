import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { collection, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { Trophy, Medal, Award, Calendar, MessageSquare, Users, VideoIcon, TrendingUp, Target } from "lucide-react";

interface ActivityMetrics {
  sessionsAttended: number;
  totalSessionsBooked: number;
  messagesSent: number;
  forumPosts: number;
  videoCallsJoined: number;
  attendanceRate: number;
  activityScore: number;
}

interface UserActivity extends ActivityMetrics {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: string;
  rank: number;
}

interface TrackerState {
  personalMetrics: ActivityMetrics | null;
  allUsers: UserActivity[];
  loading: boolean;
  error: string | null;
}

const calculateActivityScore = (metrics: ActivityMetrics): number => {
  const sessionScore = metrics.sessionsAttended * 10;
  const messageScore = metrics.messagesSent * 2;
  const forumScore = metrics.forumPosts * 5;
  const videoCallScore = metrics.videoCallsJoined * 8;
  const attendanceScore = metrics.attendanceRate * 0.5;

  return Math.round(sessionScore + messageScore + forumScore + videoCallScore + attendanceScore);
};

export function ActivityProgressTracker() {
  const { user } = useAuth();
  const [state, setState] = useState<TrackerState>({
    personalMetrics: null,
    allUsers: [],
    loading: true,
    error: null,
  });
  const [activeTab, setActiveTab] = useState<"personal" | "all">("personal");

  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersMap = new Map();
        const userActivityMap = new Map();

        usersSnapshot.docs.forEach((doc) => {
          const userData = doc.data();
          usersMap.set(doc.id, {
            name: userData.name || "Unknown",
            email: userData.email || "",
            photoURL: userData.photoURL || "/default-avatar.png",
            role: userData.role || "mentee",
          });
          userActivityMap.set(doc.id, {
            sessionsAttended: 0,
            totalSessionsBooked: 0,
            messagesSent: 0,
            forumPosts: 0,
            videoCallsJoined: 0,
            attendanceRate: 0,
            activityScore: 0,
          });
        });

        // Fetch video rooms (sessions)
        const videoRoomsSnapshot = await getDocs(collection(db, "videoRooms"));
        videoRoomsSnapshot.docs.forEach((doc) => {
          const room = doc.data();
          const mentorId = room.mentorId;
          const menteeId = room.menteeId;
          const attended = room.attended === true ? 1 : 0;

          if (mentorId && userActivityMap.has(mentorId)) {
            const current = userActivityMap.get(mentorId);
            current.videoCallsJoined += 1;
            current.sessionsAttended += attended;
          }

          if (menteeId && userActivityMap.has(menteeId)) {
            const current = userActivityMap.get(menteeId);
            current.videoCallsJoined += 1;
            current.sessionsAttended += attended;
          }
        });

        // Fetch bookings (total sessions)
        const bookingsSnapshot = await getDocs(collection(db, "bookings"));
        bookingsSnapshot.docs.forEach((doc) => {
          const booking = doc.data();
          const menteeId = booking.menteeId;
          const mentorId = booking.mentorId;

          if (menteeId && userActivityMap.has(menteeId)) {
            const current = userActivityMap.get(menteeId);
            current.totalSessionsBooked += 1;
          }

          if (mentorId && userActivityMap.has(mentorId)) {
            const current = userActivityMap.get(mentorId);
            current.totalSessionsBooked += 1;
          }
        });

        // Fetch chat messages
        const chatsSnapshot = await getDocs(collection(db, "chats"));
        for (const chatDoc of chatsSnapshot.docs) {
          const messagesSnapshot = await getDocs(
            collection(db, `chats/${chatDoc.id}/messages`)
          );
          messagesSnapshot.docs.forEach((msgDoc) => {
            const message = msgDoc.data();
            const senderId = message.senderId;

            if (senderId && userActivityMap.has(senderId)) {
              const current = userActivityMap.get(senderId);
              current.messagesSent += 1;
            }
          });
        }

        // Fetch forum messages
        const forumTopicsSnapshot = await getDocs(collection(db, "forumMessages"));
        for (const topicDoc of forumTopicsSnapshot.docs) {
          const messagesSnapshot = await getDocs(
            collection(db, `forumMessages/${topicDoc.id}/messages`)
          );
          messagesSnapshot.docs.forEach((msgDoc) => {
            const message = msgDoc.data();
            const authorId = message.authorId || message.userId;

            if (authorId && userActivityMap.has(authorId)) {
              const current = userActivityMap.get(authorId);
              current.forumPosts += 1;
            }
          });
        }

        // Calculate attendance rates and activity scores
        const allUsersActivity: UserActivity[] = [];
        userActivityMap.forEach((metrics, uid) => {
          const attendanceRate =
            metrics.totalSessionsBooked > 0
              ? Math.round((metrics.sessionsAttended / metrics.totalSessionsBooked) * 100)
              : 0;

          const metricsWithRate = {
            ...metrics,
            attendanceRate,
            activityScore: 0,
          };

          metricsWithRate.activityScore = calculateActivityScore(metricsWithRate);

          // Only include users with at least some activity
          if (
            metricsWithRate.sessionsAttended > 0 ||
            metricsWithRate.messagesSent > 0 ||
            metricsWithRate.forumPosts > 0 ||
            metricsWithRate.videoCallsJoined > 0
          ) {
            allUsersActivity.push({
              uid,
              ...usersMap.get(uid),
              ...metricsWithRate,
              rank: 0,
            });
          }
        });

        // Sort by activity score
        allUsersActivity.sort((a, b) => b.activityScore - a.activityScore);
        allUsersActivity.forEach((user, index) => {
          user.rank = index + 1;
        });

        // Get current user's metrics
        const currentUserMetrics = allUsersActivity.find((u) => u.uid === user?.uid) || null;

        setState({
          personalMetrics: currentUserMetrics
            ? {
                sessionsAttended: currentUserMetrics.sessionsAttended,
                totalSessionsBooked: currentUserMetrics.totalSessionsBooked,
                messagesSent: currentUserMetrics.messagesSent,
                forumPosts: currentUserMetrics.forumPosts,
                videoCallsJoined: currentUserMetrics.videoCallsJoined,
                attendanceRate: currentUserMetrics.attendanceRate,
                activityScore: currentUserMetrics.activityScore,
              }
            : {
                sessionsAttended: 0,
                totalSessionsBooked: 0,
                messagesSent: 0,
                forumPosts: 0,
                videoCallsJoined: 0,
                attendanceRate: 0,
                activityScore: 0,
              },
          allUsers: allUsersActivity.slice(0, 20),
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching activity data:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load activity data",
        }));
      }
    };

    fetchActivityData();
  }, [user?.uid]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return null;
    }
  };

  const PersonalProgressView = () => {
    if (!state.personalMetrics) {
      return (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">No activity data available yet.</p>
        </div>
      );
    }

    const metrics = state.personalMetrics;

    return (
      <div className="space-y-6">
        {/* User Profile Card */}
        <div className="bg-blue-100 rounded-lg shadow-md p-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-2xl font-bold text-blue-600 border-4 border-blue-200">
              {user?.displayName?.charAt(0) || "U"}
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user?.displayName || "User"}</h2>
                <span className="text-xs font-bold bg-blue-600 text-white px-3 py-1 rounded-full">
                  Mentee
                </span>
              </div>
              <p className="text-gray-700 flex items-center space-x-1">
                <span>⚡</span>
                <span>Activity Score: {metrics.activityScore}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sessions Attended */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4 mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Sessions Attended</p>
                <p className="text-3xl font-bold text-gray-900">
                  {metrics.sessionsAttended}
                  <span className="text-sm text-gray-500 ml-1">/ {metrics.totalSessionsBooked}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{metrics.attendanceRate}% attendance rate</p>
              </div>
            </div>
          </div>

          {/* Messages Sent */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Messages Sent</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.messagesSent}</p>
                <p className="text-xs text-gray-500 mt-1">In chat conversations</p>
              </div>
            </div>
          </div>

          {/* Forum Posts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Forum Posts</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.forumPosts}</p>
                <p className="text-xs text-gray-500 mt-1">Discussion forum activity</p>
              </div>
            </div>
          </div>

          {/* Video Calls */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <VideoIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Video Calls</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.videoCallsJoined}</p>
                <p className="text-xs text-gray-500 mt-1">Video sessions joined</p>
              </div>
            </div>
          </div>

          {/* Activity Score */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Activity Score</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.activityScore}</p>
                <p className="text-xs text-gray-500 mt-1">Overall engagement points</p>
              </div>
            </div>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-600 text-sm">Attendance Rate</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.attendanceRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Session participation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-50 px-8 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <span>📊</span>
              <span>Progress Overview</span>
            </h3>
          </div>

          <div className="p-8 space-y-8">
            {/* Session Attendance */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-gray-700 font-medium">Session Attendance</p>
                <p className="text-sm text-gray-600">
                  {metrics.sessionsAttended} / {metrics.totalSessionsBooked}
                </p>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      metrics.totalSessionsBooked > 0
                        ? (metrics.sessionsAttended / metrics.totalSessionsBooked) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Communication Activity */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <p className="text-gray-700 font-medium">Communication Activity</p>
                <p className="text-sm text-gray-600">
                  {metrics.messagesSent + metrics.forumPosts} total messages
                </p>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-2">
                <div
                  className="bg-gray-400 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(((metrics.messagesSent + metrics.forumPosts) / 50) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AllUsersView = () => {
    if (state.allUsers.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">No users with activity data yet.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.allUsers.map((userActivity) => (
          <div
            key={userActivity.uid}
            className={`rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
              userActivity.rank <= 3
                ? "ring-2 ring-yellow-400 bg-gradient-to-br from-yellow-50 to-white"
                : "bg-white"
            }`}
          >
            <div className="p-6">
              {/* Rank Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getRankIcon(userActivity.rank) || (
                    <span className="text-lg font-bold text-gray-600">#{userActivity.rank}</span>
                  )}
                  <span className="text-sm text-gray-500">Rank {userActivity.rank}</span>
                </div>
                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  {userActivity.role}
                </span>
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={userActivity.photoURL}
                  alt={userActivity.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{userActivity.name}</p>
                  <p className="text-xs text-gray-500 truncate">{userActivity.email}</p>
                </div>
              </div>

              {/* Score */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-600 mb-1">Activity Score</p>
                <p className="text-2xl font-bold text-blue-600">{userActivity.activityScore}</p>
              </div>

              {/* Quick Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sessions</span>
                  <span className="font-semibold">{userActivity.sessionsAttended}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Messages</span>
                  <span className="font-semibold">{userActivity.messagesSent}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Forum Posts</span>
                  <span className="font-semibold">{userActivity.forumPosts}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Video Calls</span>
                  <span className="font-semibold">{userActivity.videoCallsJoined}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between">
                  <span className="text-gray-600">Attendance</span>
                  <span className="font-semibold text-blue-600">{userActivity.attendanceRate}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold">{state.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("personal")}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === "personal"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          My Progress
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          All Users
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "personal" ? <PersonalProgressView /> : <AllUsersView />}
    </div>
  );
}

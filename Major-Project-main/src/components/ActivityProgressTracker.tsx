import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Video, 
  Users, 
  Calendar, 
  TrendingUp, 
  Award,
  Activity,
  Target
} from "lucide-react";

interface ActivityMetrics {
  sessionsAttended: number;
  totalSessions: number;
  messagesSent: number;
  forumPosts: number;
  videoCallsJoined: number;
  activityScore: number;
  attendanceRate: number;
}

interface UserProgress {
  id: string;
  name: string;
  photoURL: string;
  role: "mentee" | "mentor";
  metrics: ActivityMetrics;
}

export function ActivityProgressTracker() {
  const { user } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [allUsersProgress, setAllUsersProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"personal" | "all">("personal");

  useEffect(() => {
    const fetchProgressData = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch user's role
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        const userRole = userData?.role || "mentee";

        // Fetch all activity data
        const [videoRooms, bookings, chats, forumMessages] = await Promise.all([
          getDocs(collection(db, "videoRooms")),
          getDocs(collection(db, "bookings")),
          getDocs(collection(db, "chats")),
          getDocs(collection(db, "forumMessages"))
        ]);

        // Process video rooms
        const videoRoomsData = videoRooms.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Process bookings
        const bookingsData = bookings.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Process chats - count messages per user
        const messagesCount = new Map<string, number>();
        for (const chatDoc of chats.docs) {
          const messagesRef = collection(db, "chats", chatDoc.id, "messages");
          const messagesSnapshot = await getDocs(messagesRef);
          messagesSnapshot.docs.forEach(msgDoc => {
            const msgData = msgDoc.data();
            const senderId = msgData.senderId;
            if (senderId) {
              messagesCount.set(senderId, (messagesCount.get(senderId) || 0) + 1);
            }
          });
        }

        // Process forum messages - count posts per user
        const forumPostsCount = new Map<string, number>();
        for (const topicDoc of forumMessages.docs) {
          const topicMessagesRef = collection(db, "forumMessages", topicDoc.id, "messages");
          const topicMessagesSnapshot = await getDocs(topicMessagesRef);
          topicMessagesSnapshot.docs.forEach(msgDoc => {
            const msgData = msgDoc.data();
            const senderId = msgData.senderId;
            if (senderId) {
              forumPostsCount.set(senderId, (forumPostsCount.get(senderId) || 0) + 1);
            }
          });
        }

        // Calculate metrics for current user
        const userVideoRooms = videoRoomsData.filter(
          room => room.mentorId === user.uid || room.menteeId === user.uid
        );
        const userBookings = bookingsData.filter(
          booking => booking.mentorId === user.uid || booking.menteeId === user.uid
        );

        const attendedSessions = userVideoRooms.filter(
          room => room.attended === true || room.status === "attended"
        ).length;
        const totalSessions = userBookings.length || userVideoRooms.length || 1;
        const videoCallsJoined = userVideoRooms.filter(
          room => room.attended === true || room.status === "attended"
        ).length;
        const messagesSent = messagesCount.get(user.uid) || 0;
        const forumPosts = forumPostsCount.get(user.uid) || 0;

        const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
        
        // Calculate activity score (weighted)
        const activityScore = 
          (attendedSessions * 10) +           // Sessions: 10 points each
          (messagesSent * 2) +               // Messages: 2 points each
          (forumPosts * 5) +                 // Forum posts: 5 points each
          (videoCallsJoined * 8) +           // Video calls: 8 points each
          (attendanceRate * 0.5);            // Attendance rate: 0.5 points per %

        const currentUserProgress: UserProgress = {
          id: user.uid,
          name: user.displayName || userData?.name || "Unknown",
          photoURL: user.photoURL || userData?.photoURL || "",
          role: userRole as "mentee" | "mentor",
          metrics: {
            sessionsAttended: attendedSessions,
            totalSessions,
            messagesSent,
            forumPosts,
            videoCallsJoined,
            activityScore: Math.round(activityScore),
            attendanceRate
          }
        };

        setUserProgress(currentUserProgress);

        // Calculate for all users if needed
        if (viewMode === "all") {
          const allUsersMap = new Map<string, UserProgress>();

          // Get all unique user IDs
          const allUserIds = new Set<string>();
          videoRoomsData.forEach(room => {
            if (room.mentorId) allUserIds.add(room.mentorId);
            if (room.menteeId) allUserIds.add(room.menteeId);
          });
          bookingsData.forEach(booking => {
            if (booking.mentorId) allUserIds.add(booking.mentorId);
            if (booking.menteeId) allUserIds.add(booking.menteeId);
          });
          messagesCount.forEach((_, userId) => allUserIds.add(userId));
          forumPostsCount.forEach((_, userId) => allUserIds.add(userId));

          // Calculate metrics for each user
          for (const userId of allUserIds) {
            const userVideoRooms = videoRoomsData.filter(
              room => room.mentorId === userId || room.menteeId === userId
            );
            const userBookings = bookingsData.filter(
              booking => booking.mentorId === userId || booking.menteeId === userId
            );

            const attendedSessions = userVideoRooms.filter(
              room => room.attended === true || room.status === "attended"
            ).length;
            const totalSessions = userBookings.length || userVideoRooms.length || 1;
            const videoCallsJoined = userVideoRooms.filter(
              room => room.attended === true || room.status === "attended"
            ).length;
            const messagesSent = messagesCount.get(userId) || 0;
            const forumPosts = forumPostsCount.get(userId) || 0;

            const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
            
            const activityScore = 
              (attendedSessions * 10) +
              (messagesSent * 2) +
              (forumPosts * 5) +
              (videoCallsJoined * 8) +
              (attendanceRate * 0.5);

            // Fetch user data
            let userName = "Unknown";
            let userPhotoURL = "";
            let userRole = "mentee";
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userName = userData.name || userData.displayName || "Unknown";
                userPhotoURL = userData.photoURL || userData.avatar || "";
                userRole = userData.role || "mentee";
              }
            } catch (error) {
              console.error(`Error fetching user ${userId}:`, error);
            }

            allUsersMap.set(userId, {
              id: userId,
              name: userName,
              photoURL: userPhotoURL,
              role: userRole as "mentee" | "mentor",
              metrics: {
                sessionsAttended: attendedSessions,
                totalSessions,
                messagesSent,
                forumPosts,
                videoCallsJoined,
                activityScore: Math.round(activityScore),
                attendanceRate
              }
            });
          }

          const allProgress = Array.from(allUsersMap.values());
          allProgress.sort((a, b) => b.metrics.activityScore - a.metrics.activityScore);
          setAllUsersProgress(allProgress);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching progress data:", error);
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [user, viewMode]);

  const MetricCard = ({ 
    icon, 
    label, 
    value, 
    subtitle 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: string | number; 
    subtitle?: string;
  }) => (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-sm text-gray-600">{label}</div>
          <div className="text-2xl font-bold text-blue-600">{value}</div>
          {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading progress data...</p>
      </div>
    );
  }

  if (!userProgress) {
    return (
      <div className="text-center py-12 text-gray-500">
        No progress data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode("personal")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "personal"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          My Progress
        </button>
        <button
          onClick={() => setViewMode("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          All Users
        </button>
      </div>

      {viewMode === "personal" ? (
        <>
          {/* User Profile Card */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                <AvatarImage src={userProgress.photoURL} alt={userProgress.name} />
                <AvatarFallback className="text-2xl">
                  {userProgress.name[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">{userProgress.name}</h2>
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full font-medium">
                    {userProgress.role === "mentor" ? "Mentor" : "Mentee"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span className="text-lg font-semibold text-gray-700">
                      Activity Score: {userProgress.metrics.activityScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon={<Calendar className="w-6 h-6 text-blue-600" />}
              label="Sessions Attended"
              value={`${userProgress.metrics.sessionsAttended} / ${userProgress.metrics.totalSessions}`}
              subtitle={`${userProgress.metrics.attendanceRate.toFixed(1)}% attendance rate`}
            />
            <MetricCard
              icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
              label="Messages Sent"
              value={userProgress.metrics.messagesSent}
              subtitle="In chat conversations"
            />
            <MetricCard
              icon={<Users className="w-6 h-6 text-blue-600" />}
              label="Forum Posts"
              value={userProgress.metrics.forumPosts}
              subtitle="Discussion forum activity"
            />
            <MetricCard
              icon={<Video className="w-6 h-6 text-blue-600" />}
              label="Video Calls"
              value={userProgress.metrics.videoCallsJoined}
              subtitle="Video sessions joined"
            />
            <MetricCard
              icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
              label="Activity Score"
              value={userProgress.metrics.activityScore}
              subtitle="Overall engagement points"
            />
            <MetricCard
              icon={<Target className="w-6 h-6 text-blue-600" />}
              label="Attendance Rate"
              value={`${userProgress.metrics.attendanceRate.toFixed(1)}%`}
              subtitle="Session participation"
            />
          </div>

          {/* Progress Visualization */}
          <Card className="p-6">
            <CardTitle className="mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Progress Overview
            </CardTitle>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Session Attendance</span>
                  <span className="text-sm text-gray-600">
                    {userProgress.metrics.sessionsAttended} / {userProgress.metrics.totalSessions}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${userProgress.metrics.attendanceRate}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Communication Activity</span>
                  <span className="text-sm text-gray-600">
                    {userProgress.metrics.messagesSent + userProgress.metrics.forumPosts} total messages
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(100, ((userProgress.metrics.messagesSent + userProgress.metrics.forumPosts) / 50) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardTitle className="mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            All Users Activity Ranking
          </CardTitle>
          <CardContent>
            <div className="space-y-4">
              {allUsersProgress.slice(0, 20).map((user, index) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    index < 3
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex-shrink-0 w-8 text-center">
                    {index === 0 && <Award className="w-6 h-6 text-yellow-500 mx-auto" />}
                    {index === 1 && <Award className="w-6 h-6 text-gray-400 mx-auto" />}
                    {index === 2 && <Award className="w-6 h-6 text-amber-600 mx-auto" />}
                    {index >= 3 && <span className="text-gray-500 font-bold">{index + 1}</span>}
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.photoURL} alt={user.name} />
                    <AvatarFallback>{user.name[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg truncate">{user.name}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {user.role}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {user.metrics.sessionsAttended} sessions • {user.metrics.messagesSent} messages • {user.metrics.forumPosts} posts
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">
                      {user.metrics.activityScore}
                    </div>
                    <div className="text-xs text-gray-500">points</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



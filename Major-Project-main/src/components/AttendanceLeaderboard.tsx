import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, Users } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  name: string;
  photoURL: string;
  attendedSessions: number;
  totalSessions: number;
  attendanceRate: number;
  role: "mentee" | "mentor";
}

export function AttendanceLeaderboard() {
  const [menteeLeaderboard, setMenteeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [mentorLeaderboard, setMentorLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        // Fetch all video rooms to get attendance data
        const videoRoomsRef = collection(db, "videoRooms");
        const videoRoomsSnapshot = await getDocs(videoRoomsRef);
        
        // Fetch all bookings to get session data
        const bookingsRef = collection(db, "bookings");
        const bookingsSnapshot = await getDocs(bookingsRef);

        // Create maps to track attendance
        const menteeAttendance = new Map<string, { attended: number; total: number }>();
        const mentorAttendance = new Map<string, { attended: number; total: number }>();
        const userDataCache = new Map<string, { name: string; photoURL: string }>();

        // Process video rooms for attendance
        videoRoomsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const mentorId = data.mentorId;
          const menteeId = data.menteeId;
          const attended = data.attended === true || data.status === "attended";

          if (mentorId) {
            const current = mentorAttendance.get(mentorId) || { attended: 0, total: 0 };
            mentorAttendance.set(mentorId, {
              attended: current.attended + (attended ? 1 : 0),
              total: current.total + 1,
            });
          }

          if (menteeId) {
            const current = menteeAttendance.get(menteeId) || { attended: 0, total: 0 };
            menteeAttendance.set(menteeId, {
              attended: current.attended + (attended ? 1 : 0),
              total: current.total + 1,
            });
          }
        });

        // Process bookings for total sessions
        bookingsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const mentorId = data.mentorId;
          const menteeId = data.menteeId;

          if (mentorId) {
            const current = mentorAttendance.get(mentorId) || { attended: 0, total: 0 };
            mentorAttendance.set(mentorId, {
              attended: current.attended,
              total: current.total + 1,
            });
          }

          if (menteeId) {
            const current = menteeAttendance.get(menteeId) || { attended: 0, total: 0 };
            menteeAttendance.set(menteeId, {
              attended: current.attended,
              total: current.total + 1,
            });
          }
        });

        // Fetch user data and build leaderboard entries
        const menteeEntries: LeaderboardEntry[] = [];
        const mentorEntries: LeaderboardEntry[] = [];

        // Process mentees
        for (const [userId, stats] of menteeAttendance.entries()) {
          let userData = userDataCache.get(userId);
          if (!userData) {
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                const userInfo = userDoc.data();
                userData = {
                  name: userInfo.name || userInfo.displayName || "Unknown",
                  photoURL: userInfo.photoURL || userInfo.avatar || "",
                };
                userDataCache.set(userId, userData);
              } else {
                userData = { name: "Unknown", photoURL: "" };
              }
            } catch (error) {
              userData = { name: "Unknown", photoURL: "" };
            }
          }

          const attendanceRate = stats.total > 0 ? (stats.attended / stats.total) * 100 : 0;
          menteeEntries.push({
            id: userId,
            name: userData.name,
            photoURL: userData.photoURL,
            attendedSessions: stats.attended,
            totalSessions: stats.total,
            attendanceRate,
            role: "mentee",
          });
        }

        // Process mentors
        for (const [userId, stats] of mentorAttendance.entries()) {
          let userData = userDataCache.get(userId);
          if (!userData) {
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                const userInfo = userDoc.data();
                userData = {
                  name: userInfo.name || userInfo.displayName || "Unknown",
                  photoURL: userInfo.photoURL || userInfo.avatar || "",
                };
                userDataCache.set(userId, userData);
              } else {
                userData = { name: "Unknown", photoURL: "" };
              }
            } catch (error) {
              userData = { name: "Unknown", photoURL: "" };
            }
          }

          const attendanceRate = stats.total > 0 ? (stats.attended / stats.total) * 100 : 0;
          mentorEntries.push({
            id: userId,
            name: userData.name,
            photoURL: userData.photoURL,
            attendedSessions: stats.attended,
            totalSessions: stats.total,
            attendanceRate,
            role: "mentor",
          });
        }

        // Sort by attendance rate (descending), then by attended sessions
        menteeEntries.sort((a, b) => {
          if (b.attendanceRate !== a.attendanceRate) {
            return b.attendanceRate - a.attendanceRate;
          }
          return b.attendedSessions - a.attendedSessions;
        });

        mentorEntries.sort((a, b) => {
          if (b.attendanceRate !== a.attendanceRate) {
            return b.attendanceRate - a.attendanceRate;
          }
          return b.attendedSessions - a.attendedSessions;
        });

        setMenteeLeaderboard(menteeEntries);
        setMentorLeaderboard(mentorEntries);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">{index + 1}</span>;
  };

  const LeaderboardSection = ({
    title,
    entries,
    icon,
  }: {
    title: string;
    entries: LeaderboardEntry[];
    icon: React.ReactNode;
  }) => (
    <Card className="w-full">
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading leaderboard...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No attendance data available</div>
        ) : (
          <div className="space-y-4">
            {entries.slice(0, 10).map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  index < 3
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex-shrink-0">{getRankIcon(index)}</div>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={entry.photoURL} alt={entry.name} />
                  <AvatarFallback>{entry.name[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-lg truncate">{entry.name}</div>
                  <div className="text-sm text-gray-600">
                    {entry.attendedSessions} / {entry.totalSessions} sessions
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {entry.attendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">attendance</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <LeaderboardSection
        title="Top Mentees by Attendance"
        entries={menteeLeaderboard}
        icon={<Users className="w-6 h-6 text-blue-600" />}
      />
      <LeaderboardSection
        title="Top Mentors by Attendance"
        entries={mentorLeaderboard}
        icon={<Trophy className="w-6 h-6 text-yellow-500" />}
      />
    </div>
  );
}


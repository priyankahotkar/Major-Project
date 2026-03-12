import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, where, query } from "firebase/firestore";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  uid: string;
  name: string;
  email: string;
  attendedSessions: number;
  totalSessions: number;
  attendancePercentage: number;
  rank: number;
}

interface LeaderboardData {
  mentees: LeaderboardEntry[];
  mentors: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
}

export function AttendanceLeaderboard() {
  const [data, setData] = useState<LeaderboardData>({
    mentees: [],
    mentors: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersMap = new Map();
        usersSnapshot.docs.forEach((doc) => {
          const userData = doc.data();
          usersMap.set(doc.id, {
            uid: doc.id,
            name: userData.name || "Unknown",
            email: userData.email || "",
            role: userData.role || "mentee",
          });
        });

        // Fetch all video rooms with attendance data
        const videoRoomsSnapshot = await getDocs(collection(db, "videoRooms"));
        const attendanceMap = new Map<string, { attended: number; total: number }>();

        videoRoomsSnapshot.docs.forEach((doc) => {
          const room = doc.data();
          const mentorId = room.mentorId;
          const menteeId = room.menteeId;
          const attended = room.attended === true ? 1 : 0;

          // Track mentor attendance
          if (mentorId) {
            const current = attendanceMap.get(`mentor-${mentorId}`) || { attended: 0, total: 0 };
            attendanceMap.set(`mentor-${mentorId}`, {
              attended: current.attended + attended,
              total: current.total + 1,
            });
          }

          // Track mentee attendance
          if (menteeId) {
            const current = attendanceMap.get(`mentee-${menteeId}`) || { attended: 0, total: 0 };
            attendanceMap.set(`mentee-${menteeId}`, {
              attended: current.attended + attended,
              total: current.total + 1,
            });
          }
        });

        // Build leaderboard entries
        const mentees: LeaderboardEntry[] = [];
        const mentors: LeaderboardEntry[] = [];

        usersMap.forEach((user, uid) => {
          const menteeAttendance = attendanceMap.get(`mentee-${uid}`);
          const mentorAttendance = attendanceMap.get(`mentor-${uid}`);

          if (user.role === "mentee" && menteeAttendance && menteeAttendance.total > 0) {
            mentees.push({
              uid,
              name: user.name,
              email: user.email,
              attendedSessions: menteeAttendance.attended,
              totalSessions: menteeAttendance.total,
              attendancePercentage:
                Math.round((menteeAttendance.attended / menteeAttendance.total) * 100),
              rank: 0,
            });
          }

          if (user.role === "mentor" && mentorAttendance && mentorAttendance.total > 0) {
            mentors.push({
              uid,
              name: user.name,
              email: user.email,
              attendedSessions: mentorAttendance.attended,
              totalSessions: mentorAttendance.total,
              attendancePercentage:
                Math.round((mentorAttendance.attended / mentorAttendance.total) * 100),
              rank: 0,
            });
          }
        });

        // Sort by attendance percentage (descending), then by attended sessions
        const sortLeaderboard = (entries: LeaderboardEntry[]) => {
          return entries
            .sort((a, b) => {
              if (b.attendancePercentage !== a.attendancePercentage) {
                return b.attendancePercentage - a.attendancePercentage;
              }
              return b.attendedSessions - a.attendedSessions;
            })
            .slice(0, 10)
            .map((entry, index) => ({
              ...entry,
              rank: index + 1,
            }));
        };

        setData({
          mentees: sortLeaderboard(mentees),
          mentors: sortLeaderboard(mentors),
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load leaderboard data",
        }));
      }
    };

    fetchLeaderboardData();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return <span className="text-lg font-semibold text-gray-600">#{rank}</span>;
    }
  };

  const LeaderboardTable: React.FC<{ entries: LeaderboardEntry[]; title: string }> = ({
    entries,
    title,
  }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rank</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                Attended
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Total</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                Attendance %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No attendance data available yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.uid} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{entry.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.email}</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">
                    {entry.attendedSessions}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {entry.totalSessions}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${entry.attendancePercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-12">
                        {entry.attendancePercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold">{data.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <LeaderboardTable entries={data.mentors} title="🏆 Top Mentors by Attendance" />
      <LeaderboardTable entries={data.mentees} title="⭐ Top Mentees by Attendance" />
    </div>
  );
}

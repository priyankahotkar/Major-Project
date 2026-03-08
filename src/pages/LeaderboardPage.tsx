import React from "react";
import { Layout } from "../components/layout/Layout";
import { AttendanceLeaderboard } from "../components/AttendanceLeaderboard";

export function LeaderboardPage() {
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
}

import React from "react";
import { AttendanceLeaderboard } from "@/components/AttendanceLeaderboard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export function LeaderboardPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white">
      <Header />
      <main className="flex-1 pt-20 pb-12 container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-primary mb-2">🏆 Attendance Leaderboard</h1>
            <p className="text-gray-600 text-lg">
              Track the most active mentees and mentors based on session attendance
            </p>
          </div>
          <AttendanceLeaderboard />
        </div>
      </main>
      <Footer />
    </div>
  );
}



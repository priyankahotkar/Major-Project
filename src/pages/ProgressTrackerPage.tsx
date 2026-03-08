import React from "react";
import { Layout } from "../components/layout/Layout";
import { ActivityProgressTracker } from "../components/ActivityProgressTracker";

export function ProgressTrackerPage() {
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
}

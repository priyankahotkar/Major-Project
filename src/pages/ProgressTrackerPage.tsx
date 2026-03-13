import { TrendingUp } from "lucide-react";
import { ActivityProgressTracker } from "@/components/ActivityProgressTracker";
import { Layout } from "@/components/layout/Layout";
import { Container } from "@/components/ui/layout";
import { FadeIn } from "@/components/ui/animations";

export function ProgressTrackerPage() {
  return (
    <Layout>
      <Container className="pt-6 pb-12">
        <FadeIn>
          <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">Activity Progress Tracker</h1>
                <p className="text-sm text-slate-600">
                  Track your engagement metrics and compare with other users.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <ActivityProgressTracker />
        </FadeIn>
      </Container>
    </Layout>
  );
}

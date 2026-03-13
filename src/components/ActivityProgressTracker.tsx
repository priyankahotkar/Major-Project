import React, { useCallback, useEffect, useMemo, useState } from "react";
import { collection, collectionGroup, getDocs, onSnapshot } from "firebase/firestore";
import {
  AlertCircle,
  Award,
  Calendar,
  Loader2,
  Medal,
  MessageSquare,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

// ─── Raw DB record shapes ────────────────────────────────────────────────────

interface BookingRecord {
  id: string;
  mentorId?: string;
  menteeId?: string;
}

interface VideoRoomRecord {
  id: string;
  mentorId?: string;
  menteeId?: string;
  menteeIds: string[];
  participantIds: string[];
  bookingId?: string;
  attended?: boolean;
  status?: string;
}

interface DbUserRecord {
  id: string;
  name?: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
  details?: { fullName?: string };
}

// ─── Computed metrics per user ───────────────────────────────────────────────

interface UserMetrics {
  userId: string;
  name: string;
  photoURL?: string;
  role: string;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  videoCallsJoined: number;
  messagesSent: number;
  forumPosts: number;
  activityScore: number;
}

// ─── Parse helpers ───────────────────────────────────────────────────────────

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const toStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((i): i is string => isStr(i)) : [];

const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

const parseBooking = (id: string, raw: Record<string, unknown>): BookingRecord => ({
  id,
  mentorId: isStr(raw.mentorId) ? raw.mentorId : undefined,
  menteeId: isStr(raw.menteeId) ? raw.menteeId : undefined,
});

const parseRoom = (id: string, raw: Record<string, unknown>): VideoRoomRecord => ({
  id,
  mentorId: isStr(raw.mentorId) ? raw.mentorId : undefined,
  menteeId: isStr(raw.menteeId) ? raw.menteeId : undefined,
  menteeIds: toStrArr(raw.menteeIds),
  participantIds: toStrArr(raw.participantIds),
  bookingId: isStr(raw.bookingId) ? raw.bookingId : undefined,
  attended: typeof raw.attended === "boolean" ? raw.attended : undefined,
  status: isStr(raw.status) ? raw.status : undefined,
});

const parseDbUser = (id: string, raw: Record<string, unknown>): DbUserRecord => {
  const d =
    raw.details && typeof raw.details === "object"
      ? (raw.details as Record<string, unknown>)
      : undefined;
  return {
    id,
    name: isStr(raw.name) ? raw.name : undefined,
    displayName: isStr(raw.displayName) ? raw.displayName : undefined,
    photoURL: isStr(raw.photoURL) ? raw.photoURL : undefined,
    role: isStr(raw.role) ? raw.role : undefined,
    details: d ? { fullName: isStr(d.fullName) ? d.fullName : undefined } : undefined,
  };
};

const isAttended = (r: VideoRoomRecord) =>
  r.attended === true || r.status === "attended";

const calcScore = (
  attended: number,
  msgs: number,
  posts: number,
  calls: number,
  rate: number
) =>
  Math.round(attended * 10 + msgs * 2 + posts * 5 + calls * 8 + rate * 0.5);

const initial = (name: string) => {
  const p = name.trim().split(/\s+/);
  return p.length > 1
    ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase()
    : (p[0]?.[0]?.toUpperCase() ?? "U");
};

// ─── Small UI atoms ──────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-700" />;
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
      {rank}
    </span>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}

function MetricCard({ icon, label, value, sub }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">{icon}</div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Personal view ───────────────────────────────────────────────────────────

function PersonalView({ metrics }: { metrics: UserMetrics }) {
  const roleBadge =
    metrics.role === "mentor"
      ? "bg-indigo-100 text-indigo-700"
      : "bg-blue-100 text-blue-700";

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white shadow">
            <AvatarImage src={metrics.photoURL} alt={metrics.name} />
            <AvatarFallback className="text-lg font-bold">{initial(metrics.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">{metrics.name}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadge}`}>
                {metrics.role}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              ⚡ Activity Score:{" "}
              <span className="font-bold text-blue-700">{metrics.activityScore}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard
          icon={<Calendar className="h-5 w-5" />}
          label="Sessions Attended"
          value={metrics.attendedSessions}
          sub={`out of ${metrics.totalSessions} booked`}
        />
        <MetricCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Messages Sent"
          value={metrics.messagesSent}
          sub="in chat conversations"
        />
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Forum Posts"
          value={metrics.forumPosts}
          sub="discussion activity"
        />
        <MetricCard
          icon={<Video className="h-5 w-5" />}
          label="Video Calls"
          value={metrics.videoCallsJoined}
          sub="video sessions joined"
        />
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Activity Score"
          value={metrics.activityScore}
          sub="overall engagement"
        />
        <MetricCard
          icon={<Target className="h-5 w-5" />}
          label="Attendance Rate"
          value={`${metrics.attendanceRate.toFixed(1)}%`}
          sub="of booked sessions"
        />
      </div>

      {/* Progress bars */}
      <Card>
        <CardTitle>Progress Overview</CardTitle>
        <CardContent className="space-y-5">
          <ProgressBar
            label="Session Attendance"
            value={metrics.attendedSessions}
            max={Math.max(1, metrics.totalSessions)}
          />
          <ProgressBar
            label="Communication Activity"
            value={metrics.messagesSent + metrics.forumPosts}
            max={Math.max(50, metrics.messagesSent + metrics.forumPosts)}
          />
          <ProgressBar
            label="Video Participation"
            value={metrics.videoCallsJoined}
            max={Math.max(10, metrics.videoCallsJoined)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── All-users view ──────────────────────────────────────────────────────────

function AllUsersView({ users }: { users: UserMetrics[] }) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="py-10 text-center text-slate-500">No user activity data yet.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((u, idx) => {
        const rank = idx + 1;
        const isTop3 = rank <= 3;
        const roleBadge =
          u.role === "mentor"
            ? "bg-indigo-100 text-indigo-700"
            : "bg-blue-100 text-blue-700";

        return (
          <div
            key={u.userId}
            className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
              isTop3
                ? "border-yellow-200 bg-gradient-to-br from-yellow-50 to-white ring-1 ring-yellow-300"
                : "border-slate-100 bg-white"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <RankBadge rank={rank} />
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadge}`}>
                {u.role}
              </span>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <Avatar>
                <AvatarImage src={u.photoURL} alt={u.name} />
                <AvatarFallback>{initial(u.name)}</AvatarFallback>
              </Avatar>
              <p className="font-semibold leading-tight text-slate-900">{u.name}</p>
            </div>

            <div className="mb-3 rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xs text-slate-500">Activity Score</p>
              <p className="text-2xl font-bold text-blue-700">{u.activityScore}</p>
            </div>

            <div className="space-y-1 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Sessions attended</span>
                <span className="font-semibold text-slate-900">{u.attendedSessions}</span>
              </div>
              <div className="flex justify-between">
                <span>Messages</span>
                <span className="font-semibold text-slate-900">{u.messagesSent}</span>
              </div>
              <div className="flex justify-between">
                <span>Forum posts</span>
                <span className="font-semibold text-slate-900">{u.forumPosts}</span>
              </div>
              <div className="flex justify-between">
                <span>Video calls</span>
                <span className="font-semibold text-slate-900">{u.videoCallsJoined}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1">
                <span>Attendance</span>
                <span className="font-semibold text-blue-600">{u.attendanceRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main exported component ─────────────────────────────────────────────────

export function ActivityProgressTracker() {
  const { user } = useAuth();

  const [dbUsers, setDbUsers] = useState<DbUserRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [videoRooms, setVideoRooms] = useState<VideoRoomRecord[]>([]);

  // Separate loading flags so the UI shows as soon as live data arrives
  const [loadingLive, setLoadingLive] = useState(true);
  const [, setLoadingMessages] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Message counts fetched via collectionGroup (refreshable, not real-time)
  const [chatMsgCounts, setChatMsgCounts] = useState<Map<string, number>>(new Map());
  const [forumPostCounts, setForumPostCounts] = useState<Map<string, number>>(new Map());

  const [activeTab, setActiveTab] = useState<"personal" | "all">("personal");

  // ── Real-time listeners for users / bookings / videoRooms ──────────────────
  useEffect(() => {
    let usersOk = false;
    let bookingsOk = false;
    let roomsOk = false;

    const trySetReady = () => {
      if (usersOk && bookingsOk && roomsOk) setLoadingLive(false);
    };

    const unsub1 = onSnapshot(
      collection(db, "users"),
      (s) => {
        setDbUsers(s.docs.map((d) => parseDbUser(d.id, d.data() as Record<string, unknown>)));
        usersOk = true;
        trySetReady();
      },
      (e) => {
        console.error("users listener:", e);
        setFetchError("Failed to load user data.");
        setLoadingLive(false);
      }
    );

    const unsub2 = onSnapshot(
      collection(db, "bookings"),
      (s) => {
        setBookings(s.docs.map((d) => parseBooking(d.id, d.data() as Record<string, unknown>)));
        bookingsOk = true;
        trySetReady();
      },
      (e) => {
        console.error("bookings listener:", e);
        setFetchError("Failed to load booking data.");
        setLoadingLive(false);
      }
    );

    const unsub3 = onSnapshot(
      collection(db, "videoRooms"),
      (s) => {
        setVideoRooms(s.docs.map((d) => parseRoom(d.id, d.data() as Record<string, unknown>)));
        roomsOk = true;
        trySetReady();
      },
      (e) => {
        console.error("videoRooms listener:", e);
        setFetchError("Failed to load video room data.");
        setLoadingLive(false);
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  // ── collectionGroup fetch for message counts (re-fetchable) ───────────────
  const fetchMessageCounts = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const snapshot = await getDocs(collectionGroup(db, "messages"));
      const chat = new Map<string, number>();
      const forum = new Map<string, number>();

      snapshot.forEach((docSnap) => {
        const topLevel = docSnap.ref.path.split("/")[0];
        const raw = docSnap.data() as Record<string, unknown>;
        const senderId = isStr(raw.senderId) ? raw.senderId : undefined;
        if (!senderId) return;

        if (topLevel === "chats") {
          inc(chat, senderId);
        } else if (topLevel === "forumMessages") {
          inc(forum, senderId);
        }
      });

      setChatMsgCounts(chat);
      setForumPostCounts(forum);
    } catch (e) {
      console.error("collectionGroup messages error:", e);
      // Non-fatal — counts stay at 0
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchMessageCounts();
  }, [fetchMessageCounts]);

  // ── Compute per-user metrics ───────────────────────────────────────────────
  const allMetrics = useMemo((): UserMetrics[] => {
    const totalSessions = new Map<string, number>();
    const attendedCount = new Map<string, number>();
    const videoJoined = new Map<string, number>();

    const bookingLookup = new Map<string, BookingRecord>();
    bookings.forEach((b) => {
      bookingLookup.set(b.id, b);
      if (b.menteeId) inc(totalSessions, b.menteeId);
      if (b.mentorId) inc(totalSessions, b.mentorId);
    });

    videoRooms.forEach((room) => {
      const mentorId = room.mentorId ?? bookingLookup.get(room.bookingId ?? "")?.mentorId;

      // Derive all mentee participants
      const menteeIds = new Set<string>();
      if (room.menteeId) menteeIds.add(room.menteeId);
      room.menteeIds.forEach((id) => menteeIds.add(id));
      room.participantIds.forEach((id) => {
        if (id !== mentorId) menteeIds.add(id);
      });
      const bMentee = bookingLookup.get(room.bookingId ?? "")?.menteeId;
      if (bMentee) menteeIds.add(bMentee);
      // Fallback: "mentorId-menteeId" room id pattern
      if (menteeIds.size === 0 && mentorId) {
        const parts = room.id.split("-");
        if (parts.length === 2 && parts[0] === mentorId) menteeIds.add(parts[1]);
      }

      // Count video calls joined for everyone in this room
      if (mentorId) inc(videoJoined, mentorId);
      menteeIds.forEach((id) => inc(videoJoined, id));

      // Count attended sessions
      if (isAttended(room)) {
        if (mentorId) inc(attendedCount, mentorId);
        menteeIds.forEach((id) => inc(attendedCount, id));
      }
    });

    const usersMap = new Map(dbUsers.map((u) => [u.id, u]));

    // Union of all user IDs that have ANY activity
    const allIds = new Set<string>([
      ...totalSessions.keys(),
      ...videoJoined.keys(),
      ...chatMsgCounts.keys(),
      ...forumPostCounts.keys(),
    ]);

    return Array.from(allIds).map((userId) => {
      const u = usersMap.get(userId);
      const name = u?.name ?? u?.displayName ?? u?.details?.fullName ?? "Unknown User";
      const role = u?.role ?? "user";
      const ts = totalSessions.get(userId) ?? 0;
      const at = attendedCount.get(userId) ?? 0;
      const vc = videoJoined.get(userId) ?? 0;
      const ms = chatMsgCounts.get(userId) ?? 0;
      const fp = forumPostCounts.get(userId) ?? 0;
      const ar = ts > 0 ? Math.min((at / ts) * 100, 100) : 0;
      const score = calcScore(at, ms, fp, vc, ar);

      return {
        userId,
        name,
        photoURL: u?.photoURL,
        role,
        totalSessions: ts,
        attendedSessions: at,
        attendanceRate: ar,
        videoCallsJoined: vc,
        messagesSent: ms,
        forumPosts: fp,
        activityScore: score,
      };
    });
  }, [bookings, videoRooms, dbUsers, chatMsgCounts, forumPostCounts]);

  const sortedAll = useMemo(
    () => [...allMetrics].sort((a, b) => b.activityScore - a.activityScore).slice(0, 20),
    [allMetrics]
  );

  const myMetrics = useMemo(
    () => (user ? allMetrics.find((m) => m.userId === user.uid) : undefined),
    [allMetrics, user]
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingLive) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
        <p className="mt-3 text-slate-500">Loading activity data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{fetchError}</span>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setActiveTab("personal")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "personal"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Progress
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Users
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "personal" ? (
        myMetrics ? (
          <PersonalView metrics={myMetrics} />
        ) : (
          <Card>
            <CardContent>
              <div className="py-10 text-center text-slate-500">
                No activity recorded yet. Start by booking a session or sending a message!
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <AllUsersView users={sortedAll} />
      )}
    </div>
  );
}

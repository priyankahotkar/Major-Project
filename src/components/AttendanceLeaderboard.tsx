import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { AlertCircle, Award, Loader2, Medal, Trophy, UserCheck, Users } from "lucide-react";
import { db } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface BookingRecord {
  id: string;
  mentorId?: string;
  mentorName?: string;
  menteeId?: string;
  menteeName?: string;
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

interface UserRecord {
  id: string;
  name?: string;
  displayName?: string;
  photoURL?: string;
  details?: {
    fullName?: string;
  };
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  photoURL?: string;
  attendedSessions: number;
  totalSessions: number;
  attendanceRate: number;
}

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => isNonEmptyString(item));
};

const parseBookingRecord = (id: string, raw: Record<string, unknown>): BookingRecord => {
  return {
    id,
    mentorId: isNonEmptyString(raw.mentorId) ? raw.mentorId : undefined,
    mentorName: isNonEmptyString(raw.mentorName) ? raw.mentorName : undefined,
    menteeId: isNonEmptyString(raw.menteeId) ? raw.menteeId : undefined,
    menteeName: isNonEmptyString(raw.menteeName) ? raw.menteeName : undefined,
  };
};

const parseVideoRoomRecord = (id: string, raw: Record<string, unknown>): VideoRoomRecord => {
  return {
    id,
    mentorId: isNonEmptyString(raw.mentorId) ? raw.mentorId : undefined,
    menteeId: isNonEmptyString(raw.menteeId) ? raw.menteeId : undefined,
    menteeIds: toStringArray(raw.menteeIds),
    participantIds: toStringArray(raw.participantIds),
    bookingId: isNonEmptyString(raw.bookingId) ? raw.bookingId : undefined,
    attended: typeof raw.attended === "boolean" ? raw.attended : undefined,
    status: isNonEmptyString(raw.status) ? raw.status : undefined,
  };
};

const parseUserRecord = (id: string, raw: Record<string, unknown>): UserRecord => {
  const detailsRaw = raw.details;
  const detailsRecord =
    detailsRaw && typeof detailsRaw === "object"
      ? (detailsRaw as Record<string, unknown>)
      : undefined;
  const fullName = detailsRecord && isNonEmptyString(detailsRecord.fullName) ? detailsRecord.fullName : undefined;
  const details =
    detailsRecord
      ? {
          fullName,
        }
      : undefined;

  return {
    id,
    name: isNonEmptyString(raw.name) ? raw.name : undefined,
    displayName: isNonEmptyString(raw.displayName) ? raw.displayName : undefined,
    photoURL: isNonEmptyString(raw.photoURL) ? raw.photoURL : undefined,
    details,
  };
};

const isAttendedRoom = (room: VideoRoomRecord): boolean => {
  return room.attended === true || room.status === "attended";
};

const incrementCount = (counterMap: Map<string, number>, userId: string) => {
  counterMap.set(userId, (counterMap.get(userId) || 0) + 1);
};

const rankDecoration = (rank: number) => {
  if (rank === 1) {
    return <Trophy className="h-5 w-5 text-yellow-500" aria-label="First place" />;
  }
  if (rank === 2) {
    return <Medal className="h-5 w-5 text-slate-500" aria-label="Second place" />;
  }
  if (rank === 3) {
    return <Award className="h-5 w-5 text-amber-700" aria-label="Third place" />;
  }

  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
      {rank}
    </span>
  );
};

const userInitial = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return parts[0]?.[0]?.toUpperCase() || "U";
};

interface LeaderboardSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: LeaderboardEntry[];
}

function LeaderboardSection({ title, subtitle, icon, items }: LeaderboardSectionProps) {
  return (
    <Card className="rounded-2xl shadow-lg border border-blue-100">
      <CardTitle className="mb-2 flex items-center gap-2 text-2xl font-extrabold text-primary">
        {icon}
        <span>{title}</span>
      </CardTitle>
      <CardContent>
        <p className="mb-4 text-sm text-slate-500">{subtitle}</p>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No users with sessions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const rank = index + 1;
              return (
                <div
                  key={item.userId}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div>{rankDecoration(rank)}</div>
                    <Avatar>
                      <AvatarImage src={item.photoURL} alt={item.name} />
                      <AvatarFallback>{userInitial(item.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.attendedSessions} attended / {item.totalSessions} total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{item.attendanceRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">Attendance</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AttendanceLeaderboard() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [videoRooms, setVideoRooms] = useState<VideoRoomRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingVideoRooms, setLoadingVideoRooms] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeBookings = onSnapshot(
      collection(db, "bookings"),
      (snapshot) => {
        const parsedBookings = snapshot.docs.map((docSnap) => {
          return parseBookingRecord(docSnap.id, docSnap.data() as Record<string, unknown>);
        });
        setBookings(parsedBookings);
        setLoadingBookings(false);
      },
      (error) => {
        console.error("Error listening to bookings:", error);
        setFetchError("Unable to load booking data.");
        setLoadingBookings(false);
      }
    );

    const unsubscribeVideoRooms = onSnapshot(
      collection(db, "videoRooms"),
      (snapshot) => {
        const parsedRooms = snapshot.docs.map((docSnap) => {
          return parseVideoRoomRecord(docSnap.id, docSnap.data() as Record<string, unknown>);
        });
        setVideoRooms(parsedRooms);
        setLoadingVideoRooms(false);
      },
      (error) => {
        console.error("Error listening to videoRooms:", error);
        setFetchError("Unable to load attendance room data.");
        setLoadingVideoRooms(false);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const parsedUsers = snapshot.docs.map((docSnap) => {
          return parseUserRecord(docSnap.id, docSnap.data() as Record<string, unknown>);
        });
        setUsers(parsedUsers);
        setLoadingUsers(false);
      },
      (error) => {
        console.error("Error listening to users:", error);
        setFetchError("Unable to load user profile data.");
        setLoadingUsers(false);
      }
    );

    return () => {
      unsubscribeBookings();
      unsubscribeVideoRooms();
      unsubscribeUsers();
    };
  }, []);

  const { menteeLeaderboard, mentorLeaderboard } = useMemo(() => {
    const menteeTotalSessions = new Map<string, number>();
    const mentorTotalSessions = new Map<string, number>();
    const menteeAttendedSessions = new Map<string, number>();
    const mentorAttendedSessions = new Map<string, number>();
    const fallbackNames = new Map<string, string>();

    const bookingLookup = new Map<string, BookingRecord>();
    bookings.forEach((booking) => {
      bookingLookup.set(booking.id, booking);

      if (booking.menteeId) {
        incrementCount(menteeTotalSessions, booking.menteeId);
        if (booking.menteeName && !fallbackNames.has(booking.menteeId)) {
          fallbackNames.set(booking.menteeId, booking.menteeName);
        }
      }

      if (booking.mentorId) {
        incrementCount(mentorTotalSessions, booking.mentorId);
        if (booking.mentorName && !fallbackNames.has(booking.mentorId)) {
          fallbackNames.set(booking.mentorId, booking.mentorName);
        }
      }
    });

    videoRooms.forEach((room) => {
      if (!isAttendedRoom(room)) {
        return;
      }

      let mentorId = room.mentorId;
      if (!mentorId && room.bookingId) {
        mentorId = bookingLookup.get(room.bookingId)?.mentorId;
      }

      if (mentorId) {
        incrementCount(mentorAttendedSessions, mentorId);
      }

      const menteeIds = new Set<string>();

      if (room.menteeId) {
        menteeIds.add(room.menteeId);
      }

      room.menteeIds.forEach((menteeId) => {
        menteeIds.add(menteeId);
      });

      room.participantIds.forEach((participantId) => {
        if (!mentorId || participantId !== mentorId) {
          menteeIds.add(participantId);
        }
      });

      if (room.bookingId) {
        const booking = bookingLookup.get(room.bookingId);
        if (booking?.menteeId) {
          menteeIds.add(booking.menteeId);
        }
      }

      // Fallback for room ids that follow "mentorId-menteeId" format.
      if (menteeIds.size === 0 && mentorId) {
        const idParts = room.id.split("-");
        if (idParts.length === 2 && idParts[0] === mentorId && idParts[1] !== mentorId) {
          menteeIds.add(idParts[1]);
        }
      }

      menteeIds.forEach((menteeId) => {
        incrementCount(menteeAttendedSessions, menteeId);
      });
    });

    const usersMap = new Map(users.map((user) => [user.id, user]));

    const buildLeaderboard = (
      totalMap: Map<string, number>,
      attendedMap: Map<string, number>
    ): LeaderboardEntry[] => {
      return Array.from(totalMap.entries())
        .filter(([, totalSessions]) => totalSessions > 0)
        .map(([userId, totalSessions]) => {
          const attendedSessions = attendedMap.get(userId) || 0;
          const attendanceRate = Math.min((attendedSessions / totalSessions) * 100, 100);
          const user = usersMap.get(userId);
          const name =
            user?.name ||
            user?.displayName ||
            user?.details?.fullName ||
            fallbackNames.get(userId) ||
            "Unknown User";

          return {
            userId,
            name,
            photoURL: user?.photoURL,
            attendedSessions,
            totalSessions,
            attendanceRate,
          };
        })
        .sort((a, b) => {
          if (b.attendanceRate !== a.attendanceRate) {
            return b.attendanceRate - a.attendanceRate;
          }
          if (b.attendedSessions !== a.attendedSessions) {
            return b.attendedSessions - a.attendedSessions;
          }
          if (b.totalSessions !== a.totalSessions) {
            return b.totalSessions - a.totalSessions;
          }
          return a.name.localeCompare(b.name);
        })
        .slice(0, 10);
    };

    return {
      menteeLeaderboard: buildLeaderboard(menteeTotalSessions, menteeAttendedSessions),
      mentorLeaderboard: buildLeaderboard(mentorTotalSessions, mentorAttendedSessions),
    };
  }, [bookings, users, videoRooms]);

  const isLoading = loadingBookings || loadingVideoRooms || loadingUsers;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading attendance leaderboards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {fetchError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <span>{fetchError}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LeaderboardSection
          title="Top Mentees"
          subtitle="Ranked by attendance rate, then attended sessions."
          icon={<Users className="h-6 w-6 text-primary" />}
          items={menteeLeaderboard}
        />
        <LeaderboardSection
          title="Top Mentors"
          subtitle="Ranked by attendance rate, then attended sessions."
          icon={<UserCheck className="h-6 w-6 text-primary" />}
          items={mentorLeaderboard}
        />
      </div>
    </div>
  );
}
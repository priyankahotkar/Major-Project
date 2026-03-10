import React, { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { CardContent } from "@/components/ui/card";

interface BookingNotification {
  id: string;
  menteeName: string;
  date: Date;
  timeSlot: string;
  createdAt?: Date;
}

const MentorSessionNotifications: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [bookings, setBookings] = useState<BookingNotification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef,
      where("mentorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextBookings: BookingNotification[] = [];

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as any;

        const dateValue =
          data.date?.toDate?.() ||
          new Date(data.date);
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

        const createdAtValue =
          data.createdAt?.toDate?.() ||
          (data.createdAt ? new Date(data.createdAt) : undefined);
        const createdAt = createdAtValue instanceof Date ? createdAtValue : createdAtValue ?? undefined;

        const booking: BookingNotification = {
          id: change.doc.id,
          menteeName: data.menteeName || "Unknown mentee",
          date,
          timeSlot: data.timeSlot || "",
          createdAt,
        };

        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);

        // For popups: only react to newly added future/today sessions we haven't seen yet
        if (
          change.type === "added" &&
          !seenIdsRef.current.has(booking.id) &&
          sessionDate >= today
        ) {
          seenIdsRef.current.add(booking.id);

          const when = date.toLocaleDateString();
          const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

          showNotification({
            title: "New session booked",
            message: `${booking.menteeName} booked a session on ${when} at ${booking.timeSlot || time}.`,
          });
        }
      });

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const dateValue =
          data.date?.toDate?.() ||
          new Date(data.date);
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

        const createdAtValue =
          data.createdAt?.toDate?.() ||
          (data.createdAt ? new Date(data.createdAt) : undefined);

        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);

        if (sessionDate < today) {
          return;
        }

        nextBookings.push({
          id: docSnap.id,
          menteeName: data.menteeName || "Unknown mentee",
          date,
          timeSlot: data.timeSlot || "",
          createdAt: createdAtValue instanceof Date ? createdAtValue : createdAtValue ?? undefined,
        });
      });

      setBookings(nextBookings);
    });

    return () => unsubscribe();
  }, [user, showNotification]);

  if (!user) return null;

  if (bookings.length === 0) {
    return (
      <CardContent>
        <p className="text-gray-500 text-sm">No recent session bookings.</p>
      </CardContent>
    );
  }

  return (
    <CardContent className="space-y-3">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="flex flex-col md:flex-row md:items-center md:justify-between rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm"
        >
          <div className="flex items-center gap-2 mb-1 md:mb-0">
            <User className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-900">
              New session with {booking.menteeName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              {booking.date.toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {booking.timeSlot ||
                booking.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      ))}
    </CardContent>
  );
};

export default MentorSessionNotifications;


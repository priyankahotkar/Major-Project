import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Video, LogOut, Star } from "lucide-react";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface UpcomingSession {
  id: string;
  title: string;
  date: Date;
  mentor: {
    name: string;
    avatar: string;
    domain?: string;
    experience?: string;
    expertise?: string;
  };
}

interface Mentor {
  id: string;
  name: string;
  photoURL: string;
  domain: string;
  experience: string;
  expertise: string;
  highestFrequencyRating: string;
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Fetch real upcoming sessions from Firestore
  useEffect(() => {
    const fetchUpcomingSessions = async () => {
      if (!user) return;

      try {
        const sessionsRef = collection(db, "bookings");
        const q = query(
          sessionsRef,
          where("menteeId", "==", user.uid),
          orderBy("date", "asc")
        );
        const snapshot = await getDocs(q);

        const rawSessions: UpcomingSession[] = await Promise.all(
          snapshot.docs.map(async (bookingDoc) => {
            const data = bookingDoc.data() as any;

            const dateValue =
              data.date?.toDate?.() || // Firestore Timestamp
              new Date(data.date); // ISO string
            const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

            let domain: string | undefined;
            let experience: string | undefined;
            let expertise: string | undefined;

            try {
              if (data.mentorId) {
                const mentorRef = doc(db, "users", data.mentorId);
                const mentorSnap = await getDoc(mentorRef);
                if (mentorSnap.exists()) {
                  const mentorData = mentorSnap.data() as any;
                  domain = mentorData.details?.domain || mentorData.domain || "General";
                  experience = mentorData.details?.experience || mentorData.experience || "Not specified";
                  expertise = mentorData.details?.expertise || mentorData.expertise || "Not specified";
                }
              }
            } catch (e) {
              console.error("Error fetching mentor details for booking", bookingDoc.id, e);
            }

            return {
              id: bookingDoc.id,
              title: `Session with ${data.mentorName}`,
              date,
              mentor: {
                name: data.mentorName,
                avatar: data.mentorPhotoURL || "https://via.placeholder.com/100",
                domain,
                experience,
                expertise,
              },
            };
          })
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Only keep sessions whose date >= current date
        const upcomingOnly = rawSessions.filter((session) => {
          const d = new Date(session.date);
          d.setHours(0, 0, 0, 0);
          return d >= today;
        });

        setUpcomingSessions(upcomingOnly);
      } catch (error) {
        console.error("Error fetching upcoming sessions:", error);
      }
    };

    fetchUpcomingSessions();
  }, [user]);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const mentorsRef = collection(db, "users");
        const q = query(mentorsRef, where("role", "==", "mentor"));
        const snapshot = await getDocs(q);

        const fetchedMentors = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          const details = data.details || {};

          const ratings = data.ratings || details.ratings || [];

          // Calculate the frequency of each rating (1-5)
          const ratingFrequency = ratings.reduce(
            (acc: Record<number, number>, rating: number) => {
              acc[rating] = (acc[rating] || 0) + 1;
              return acc;
            },
            {}
          );

          // Find the rating with the highest frequency
          const highestFrequencyRating = Object.keys(ratingFrequency).reduce((a, b) => {
            return ratingFrequency[Number(a)] > ratingFrequency[Number(b)] ? a : b;
          }, "1");

          return {
            id: docSnap.id,
            name: data.name || details.fullName,
            photoURL: data.photoURL,
            domain: details.domain || data.domain,
            experience: details.experience || data.experience,
            expertise: details.expertise || data.expertise,
            highestFrequencyRating,
          };
        });

        setMentors(fetchedMentors);
      } catch (error) {
        console.error("Error fetching mentors:", error);
      }
    };

    fetchMentors();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white">
      <Header />
      <main className="flex-1 pt-20 pb-12 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="col-span-1">
            <div className="bg-gradient-to-b from-primary/10 via-white to-white rounded-2xl shadow-md border border-primary/10 p-6 space-y-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Quick Actions</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Jump into the most common things you do as a mentee.
                </p>
              </div>
              <div className="space-y-2.5">
                <Link to="/booking">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Book a new session</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Pick mentor &amp; time</span>
                  </Button>
                </Link>
                <Link to="/chat">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Messages</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Chat with mentors</span>
                  </Button>
                </Link>
                <Link to="/discussion-forum">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Discussion forum</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Ask &amp; answer</span>
                  </Button>
                </Link>
                <Link to="/faq">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">FAQs</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Common questions</span>
                  </Button>
                </Link>
                <Link to="/roadmap">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI roadmap</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Personal learning plan</span>
                  </Button>
                </Link>
                <Link to="/ai-interview">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">AI mock interview</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Practice rounds</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          {/* Main Content Sections */}
          <div className="col-span-2 space-y-8">
            {/* Upcoming Sessions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-primary">Upcoming Sessions</h2>
                  <p className="text-sm text-gray-500">
                    Sessions from today onwards. You can start a video call only on the day of the session.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between shadow-sm border border-blue-100"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={session.mentor.avatar} alt={session.mentor.name} />
                          <AvatarFallback>{session.mentor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="font-semibold text-base text-gray-900">{session.title}</div>
                          <div className="text-gray-500 text-sm">
                            {session.date.toLocaleDateString()}{" "}
                            {session.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {session.mentor.domain && (
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                              {session.mentor.domain || "General"}
                            </div>
                          )}
                          {session.mentor.experience && (
                            <div className="text-[11px] text-gray-500">
                              Experience: {session.mentor.experience}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-4 md:mt-0 sm:flex-row">
                        {isSameDay(session.date, new Date()) && (
                          <Link to={`/video-call/${session.id}`}>
                            <Button className="bg-blue-600 text-white hover:bg-blue-700">
                              <Video className="mr-2 h-4 w-4" /> Start Video Call
                            </Button>
                          </Link>
                        )}
                        <Link to={`/voice-call/${session.id}`}>
                          <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50">
                            <MessageSquare className="mr-2 h-4 w-4" /> Voice Call
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-8">No upcoming sessions</div>
                )}
              </div>
            </div>
            {/* Mentors Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-primary">Mentors</h2>
                  <p className="text-sm text-gray-500">
                    Discover mentors you can learn from and book directly.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {mentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="group p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl shadow-sm border border-blue-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="ring-2 ring-primary/10">
                        <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                        <AvatarFallback>{mentor.name ? mentor.name[0] : "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-base text-slate-900">{mentor.name}</div>
                          <div className="flex items-center gap-1 text-amber-500 text-xs">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < Number(mentor.highestFrequencyRating || 0) ? "fill-current" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-xs font-medium text-primary/80 uppercase tracking-wide">
                          {mentor.domain || "General"}
                        </div>
                        <div className="text-sm text-gray-600 line-clamp-2">{mentor.expertise}</div>
                        <div className="text-xs text-gray-400">
                          Experience: {mentor.experience || "Not specified"}
                        </div>
                        <Link to="/booking">
                          <Button
                            size="sm"
                            className="mt-2 bg-primary text-white hover:bg-primary/90"
                          >
                            Book session
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
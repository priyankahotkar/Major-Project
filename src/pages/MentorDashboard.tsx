import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Video, LogOut, PlusCircle, Sun, Moon, Calendar } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, collection, query, where, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import MentorSessionNotifications from "@/components/MentorSessionNotifications";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface Mentee {
  id: string;
  name: string;
  avatar: string;
  domain: string;
}

interface Session {
  id: string;
  menteeName: string;
  date: Date;
  timeSlot: string;
}

export function MentorDashboardPage() {
  const { user, logout } = useAuth();
  const [jitsiRoom, setJitsiRoom] = useState<string | null>(null);
  const [bookedSessions, setBookedSessions] = useState<Session[]>([]);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const navigate = useNavigate();

  const isSameDay = (a: Date, b: Date) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  // Fetch booked sessions for the mentor
  useEffect(() => {
    const fetchBookedSessions = async () => {
      if (!user) return;

      try {
        const sessionsRef = collection(db, "bookings");
        const q = query(
          sessionsRef,
          where("mentorId", "==", user.uid),
          orderBy("date", "asc")
        );
        const snapshot = await getDocs(q);

        const sessionsList: Session[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const dateValue =
            data.date?.toDate?.() || // If it's a Firestore Timestamp, convert to Date
            new Date(data.date); // If it's a string, convert to Date

          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

          return {
            id: doc.id,
            menteeName: data.menteeName,
            date,
            timeSlot: data.timeSlot,
          };
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Hide sessions with date < current date on mentor dashboard
        const upcomingSessions = sessionsList.filter((session) => {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate >= today;
        });

        setBookedSessions(upcomingSessions);
      } catch (error) {
        console.error("Error fetching booked sessions for mentor:", error);
      }
    };

    fetchBookedSessions();
  }, [user]);

  // Fetch real mentees associated with the mentor
  useEffect(() => {
    const fetchMentees = async () => {
      if (!user) return;

      try {
        const sessionsRef = collection(db, "bookings");
        const q = query(sessionsRef, where("mentorId", "==", user.uid));
        const snapshot = await getDocs(q);

        const menteesList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: data.menteeId,
            name: data.menteeName,
            avatar: data.menteePhotoURL || "https://via.placeholder.com/100", // Default avatar if missing
            domain: data.menteeDomain || "Not Specified", // Optional mentee domain
          };
        });

        // Remove duplicates based on mentee ID
        const uniqueMentees = Array.from(
          new Map(menteesList.map((mentee) => [mentee.id, mentee])).values()
        );

        setMentees(uniqueMentees);
      } catch (error) {
        console.error("Error fetching mentees for mentor:", error);
      }
    };

    fetchMentees();
  }, [user]);

  const generateJitsiRoom = async () => {
    if (!user) {
      console.error("User is not authenticated.");
      return;
    }
  
    const newRoom = `mentor-room-${uuidv4()}`;
    setJitsiRoom(newRoom);
  
    // Save the room to Firestore for mentees to join
    try {
      const roomRef = doc(db, "videoRooms", newRoom);
      await setDoc(roomRef, {
        mentorId: user.uid,
        mentorName: user.displayName || "Unknown Mentor",
        createdAt: new Date(),
      });
      console.log("Room created:", newRoom);

      // Navigate to the VideoCallPage with the room ID
      navigate(`/video-call/${newRoom}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

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
                  Jump into the most common things you do as a mentor.
                </p>
              </div>
              <div className="space-y-2.5">
                <Link to="/chat">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Chat with Mentees</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Messages</span>
                  </Button>
                </Link>
                <Link to="/discussion-forum">
                  <Button className="w-full justify-between bg-white hover:bg-primary/5 border border-slate-200 text-slate-900">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Discussion Forum</span>
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
                <Button onClick={generateJitsiRoom} className="w-full justify-between bg-blue-500 hover:bg-blue-600 text-white">
                  <span className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Start New Video Call</span>
                  </span>
                  <span className="text-[11px] text-blue-100">Create room</span>
                </Button>
              </div>
            </div>
          </div>
          {/* Main Content Sections */}
          <div className="col-span-2 space-y-8">
            {/* Notifications - new session bookings for this mentor */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-extrabold mb-4 text-primary">Notifications</h2>
              <MentorSessionNotifications />
            </div>
            {/* Booked Sessions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-extrabold mb-4 text-primary">Booked Sessions</h2>
              {bookedSessions.length > 0 ? (
                <ul className="space-y-4">
                  {bookedSessions.map((session) => (
                    <li key={session.id} className="p-4 bg-blue-50 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between shadow border-b">
                      <span className="font-semibold">Mentee: {session.menteeName}</span>
                      <span>
                        Date: {session.date.toLocaleDateString()}{" "}
                        {session.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>Time Slot: {session.timeSlot}</span>
                      {isSameDay(session.date, new Date()) && (
                        <Button
                          className="mt-2 md:mt-0 bg-blue-600 text-white"
                          size="sm"
                          onClick={generateJitsiRoom}
                        >
                          <Video className="mr-1 h-4 w-4" />
                          Start Session
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No booked sessions</p>
              )}
            </div>
            {/* Your Mentees */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-extrabold mb-4 text-primary">Your Mentees</h2>
              <div className="space-y-4">
                {mentees.length > 0 ? (
                  mentees.map((mentee) => (
                    <div key={mentee.id} className="bg-blue-50 p-4 rounded-lg shadow flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={mentee.avatar} alt={mentee.name || 'Unknown'} />
                          <AvatarFallback>{mentee.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{mentee.name || 'Unknown'}</h3>
                          <p className="text-sm text-gray-400">Domain: {mentee.domain || 'Not Specified'}</p>
                        </div>
                      </div>
                      <Link to="/chat">
                        <Button variant="outline">
                          <MessageSquare className="mr-2 h-4 w-4" /> Chat
                        </Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No mentees found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

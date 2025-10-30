import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Video, LogOut } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

interface UpcomingSession {
  id: string;
  title: string;
  date: string;
  mentor: {
    name: string;
    avatar: string;
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

        const sessionsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: `Session with ${data.mentorName}`,
            date: new Date(data.date).toLocaleString(),
            mentor: {
              name: data.mentorName,
              avatar: data.mentorPhotoURL || "https://via.placeholder.com/100", // Default avatar if missing
            },
          };
        }) as UpcomingSession[];

        setUpcomingSessions(sessionsList);
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

        const fetchedMentors = snapshot.docs.map((doc) => {
          const data = doc.data();
          const ratings = data.ratings || [];

          // Calculate the frequency of each rating (1-5)
          const ratingFrequency = ratings.reduce((acc: Record<number, number>, rating: number) => {
            acc[rating] = (acc[rating] || 0) + 1;
            return acc;
          }, {});

          // Find the rating with the highest frequency
          const highestFrequencyRating = Object.keys(ratingFrequency).reduce((a, b) => {
            return ratingFrequency[Number(a)] > ratingFrequency[Number(b)] ? a : b;
          }, "1");

          return {
            id: doc.id,
            name: data.name,
            photoURL: data.photoURL,
            domain: data.domain,
            experience: data.experience,
            expertise: data.expertise,
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
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
              <h2 className="text-xl sm:text-2xl font-extrabold mb-2 text-primary">Quick Actions</h2>
              <div className="space-y-3">
                <Link to="/booking">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="mr-2 h-5 w-5" /> Book Session
                  </Button>
                </Link>
                <Link to="/chat">
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="mr-2 h-5 w-5" /> Messages
                  </Button>
                </Link>
                <Link to="/discussion-forum">
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="mr-2 h-5 w-5" /> Discussion Forum
                  </Button>
                </Link>
                <Link to="/faq">
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="mr-2 h-5 w-5" /> FAQs
                  </Button>
                </Link>
                <Link to="/roadmap">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="mr-2 h-5 w-5" /> Generate Roadmap
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          {/* Main Content Sections */}
          <div className="col-span-2 space-y-8">
            {/* Upcoming Sessions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-extrabold mb-4 text-primary">Upcoming Sessions</h2>
              <div className="space-y-4">
                {upcomingSessions.length > 0 ? (
                  upcomingSessions.map((session) => (
                    <div key={session.id} className="p-5 bg-blue-50 rounded-lg flex items-center justify-between shadow border-b">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={session.mentor.avatar} alt={session.mentor.name} />
                          <AvatarFallback>{session.mentor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold">{session.title}</div>
                          <div className="text-gray-500 text-sm">{session.date}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Link to={`/video-call/${session.id}`}><Button className="bg-blue-500 text-white"><Video className="mr-2 h-4 w-4" /> Video Call</Button></Link>
                        <Link to={`/voice-call/${session.id}`}><Button className="bg-green-500 text-white"><MessageSquare className="mr-2 h-4 w-4" /> Voice Call</Button></Link>
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
              <h2 className="text-2xl font-extrabold mb-4 text-primary">Mentors</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {mentors.map((mentor) => (
                  <div key={mentor.id} className="p-4 bg-blue-50 rounded-lg shadow border">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                        <AvatarFallback>{mentor.name ? mentor.name[0] : "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-lg">{mentor.name}</div>
                        <div className="text-sm text-gray-500">{mentor.expertise}</div>
                        <div className="text-xs text-yellow-600 font-medium">Most Frequent Rating: {mentor.highestFrequencyRating}</div>
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
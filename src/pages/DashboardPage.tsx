import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MessageSquare, Video, LogOut } from "lucide-react";
import { collection, query, where, getDocs, orderBy, doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";

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
  const { user, logout, role, updateRole } = useAuth();
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
        const snapshot = await getDocs(mentorsRef);

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

  const handleRoleChange = async (newRole: "mentor" | "mentee") => {
    if (!newRole || newRole === role) return; // Prevent unnecessary updates
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        role: newRole,
        detailsCompleted: false, // Reset details completion status
        updatedAt: new Date(), // Add a timestamp for updates
      }, { merge: true });
      await updateRole(newRole); // Call updateRole from AuthContext
      window.location.href = `/dashboard/${newRole}`; // Redirect to the correct dashboard
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="text-xl font-bold text-primary">
                MentorConnect
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <select
                className="border p-2 rounded"
                value={role || ""}
                onChange={(e) => handleRoleChange(e.target.value as "mentor" | "mentee")}
              >
                <option value="">Select Role</option>
                <option value="mentor">Mentor</option>
                <option value="mentee">Mentee</option>
              </select>
              <Button variant="ghost" onClick={logout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="col-span-1 space-y-4">
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <Link to="/booking">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="mr-2 h-5 w-5" />
                Book Session
              </Button>
            </Link>
            <Link to="/chat">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-5 w-5" />
                Messages
              </Button>
            </Link>
            <Link to="/discussion-forum">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-5 w-5" />
                Discussion Forum
              </Button>
            </Link>
            <Link to="/faq">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-5 w-5" />
                FAQs
              </Button>
            </Link>
          </div>

          {/* Upcoming Sessions */}
          <div className="col-span-2">
            <h2 className="text-2xl font-bold mb-4">Upcoming Sessions</h2>
            <div className="space-y-4">
              {upcomingSessions.length > 0 ? (
                upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white p-6 rounded-lg shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={session.mentor.avatar} alt={session.mentor.name} />
                          <AvatarFallback>{session.mentor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{session.title}</h3>
                          <p className="text-sm text-gray-500">{session.date}</p>
                        </div>
                      </div>
                      <Link to={`/video-call/${session.id}`}>
                        <Button className="bg-blue-500 text-white px-4 py-2">
                          <Video className="mr-2 h-4 w-4" />
                          Join Video Call
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No upcoming sessions</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mentors Section */}
      <div className="container mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-4">Mentors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mentors.map((mentor) => (
            <div key={mentor.id} className="p-4 bg-white rounded-lg shadow-md">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                  <AvatarFallback>{mentor.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{mentor.name}</h3>
                  <p className="text-sm text-gray-500">{mentor.expertise}</p>
                  <p className="text-sm text-yellow-500">
                    Most Frequent Rating: {mentor.highestFrequencyRating}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
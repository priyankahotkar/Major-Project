import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Video, LogOut, PlusCircle, Sun, Moon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, collection, query, where, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import Notifications from "@/components/Notifications";

interface Mentee {
  id: string;
  name: string;
  avatar: string;
  domain: string;
}

interface Session {
  id: string;
  menteeName: string;
  date: string;
  timeSlot: string;
}

export function MentorDashboardPage() {
  const { user, logout } = useAuth();
  const [jitsiRoom, setJitsiRoom] = useState<string | null>(null);
  const [bookedSessions, setBookedSessions] = useState<Session[]>([]);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const navigate = useNavigate();

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

        const sessionsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          const date =
            data.date?.toDate?.() || // If it's a Firestore Timestamp, convert to Date
            new Date(data.date); // If it's a string, convert to Date

          return {
            id: doc.id,
            menteeName: data.menteeName,
            date: date.toLocaleString(), // Convert Date to readable string
            timeSlot: data.timeSlot,
          };
        }) as Session[];

        setBookedSessions(sessionsList);
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

  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setTimeSlots(userSnap.data().availableTimeSlots || []);
        }
      } catch (error) {
        console.error("Error fetching time slots:", error);
      }
    };

    fetchTimeSlots();
  }, [user]);

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setTimeSlots([...timeSlots, value]);
    } else {
      setTimeSlots(timeSlots.filter((slot) => slot !== value));
    }
  };

  const updateTimeSlots = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { availableTimeSlots: timeSlots }, { merge: true }); // Save updated time slots
      alert("Time slots updated successfully!");
    } catch (error) {
      console.error("Error updating time slots:", error);
      alert("Failed to update time slots. Please try again.");
    }
  };

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
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/mentor-dashboard" className="text-xl font-bold text-primary">
              MentorConnect - Mentor
            </Link>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
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
            <Link to="/chat">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-5 w-5" />
                Chat with Mentees
              </Button>
            </Link>
            <Link to="/discussion-forum">
              <Button className="w-full justify-start" variant="outline">
                <MessageSquare className="mr-2 h-5 w-5" />
                Discussion Forum
              </Button>
            </Link>
            <Button onClick={generateJitsiRoom} className="w-full justify-start bg-blue-500 text-white">
              <PlusCircle className="mr-2 h-5 w-5" />
              Start New Video Call
            </Button>
          </div>

          {/* Notifications */}
          <div className="col-span-2">
            <h2 className="text-2xl font-bold mb-4">Notifications</h2>
            <Notifications />
          </div>

          {/* Booked Sessions */}
          <div className="col-span-2">
            <h2 className="text-2xl font-bold mb-4">Booked Sessions</h2>
            {bookedSessions.length > 0 ? (
              <ul className="space-y-4">
                {bookedSessions.map((session) => (
                  <li key={session.id} className="p-4 bg-white rounded-lg shadow-sm border">
                    <p className="font-semibold">Mentee: {session.menteeName}</p>
                    <p>Date: {session.date}</p>
                    <p>Time Slot: {session.timeSlot}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No booked sessions</p>
            )}
          </div>

          {/* Mentee List */}
          <div className="col-span-2">
            <h2 className="text-2xl font-bold mb-4">Your Mentees</h2>
            <div className="space-y-4">
              {mentees.length > 0 ? (
                mentees.map((mentee) => (
                  <div key={mentee.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={mentee.avatar} alt={mentee.name || "Unknown"} />
                          <AvatarFallback>{mentee.name?.[0] || "U"}</AvatarFallback> {/* Add null check */}
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{mentee.name || "Unknown"}</h3> {/* Add fallback */}
                          <p className="text-sm text-gray-400">Domain: {mentee.domain || "Not Specified"}</p>
                        </div>
                      </div>
                      <Link to="/chat">
                        <Button variant="outline">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Chat
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No mentees found</p>
              )}
            </div>
          </div>

          {/* Update Available Time Slots */}
          <div className="col-span-2">
            <h2 className="text-2xl font-bold mb-4">Update Available Time Slots</h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].map((slot) => (
                <label key={slot} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={slot}
                    checked={timeSlots.includes(slot)}
                    onChange={handleTimeSlotChange}
                    className="form-checkbox"
                  />
                  <span>{slot}</span>
                </label>
              ))}
            </div>
            <Button onClick={updateTimeSlots} className="bg-blue-500 text-white">
              Update Time Slots
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { collection, getDocs, query, where, orderBy, doc, addDoc, serverTimestamp, getDoc, updateDoc, Timestamp, onSnapshot, limit, arrayUnion } from "firebase/firestore";
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Mentor {
  id: string;
  name: string;
  email: string;
  photoURL: string;
  role: string;
  domain: string;
  experience: string;
  expertise: string;
  availableTimeSlots?: string[]; // Add availableTimeSlots to Mentor interface
  rating?: number; // Add rating to Mentor interface
}

interface Session {
  id: string;
  mentorName: string;
  date: string;
  timeSlot: string;
}

interface Meeting {
  id: string;
  roomId: string;
  mentorName: string;
  createdAt: Timestamp;
  attended? : boolean;
  status?: string; // Add status field to Meeting interface
}

const timeSlots = [
  '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'
];

const RateMentor: React.FC<{ mentorId: string; mentorName: string }> = ({ mentorId, mentorName }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleRatingSubmit = async () => {
    if (!rating) return;

    try {
      const mentorRef = doc(db, "users", mentorId);
      const mentorSnap = await getDoc(mentorRef);

      if (mentorSnap.exists()) {
        const mentorData = mentorSnap.data();
        const currentRatings = mentorData.ratings || [];
        const updatedRatings = [...currentRatings, rating];
        const averageRating =
          updatedRatings.reduce((sum, r) => sum + r, 0) / updatedRatings.length;

        await updateDoc(mentorRef, {
          ratings: arrayUnion(rating),
          averageRating,
        });

        setSubmitted(true);
        alert(`Rating submitted successfully for ${mentorName}!`);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold">Rate {mentorName}</h3>
      <div className="flex space-x-2 mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={`p-2 rounded-full ${
              rating === star ? "bg-yellow-400" : "bg-gray-200"
            }`}
            onClick={() => setRating(star)}
          >
            {star}★
          </button>
        ))}
      </div>
      <button
        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handleRatingSubmit}
        disabled={submitted}
      >
        {submitted ? "Submitted" : "Submit Rating"}
      </button>
    </div>
  );
};

export function BookingPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [bookedSessions, setBookedSessions] = useState<Session[]>([]);
  const [ongoingMeetings, setOngoingMeetings] = useState<Meeting[]>([]);
  const [mentorTimeSlots, setMentorTimeSlots] = useState<string[]>([]); // Add state for mentor's time slots
  const [attendedMeetings, setAttendedMeetings] = useState<Meeting[]>([]); // Add state for attended meetings

  // Fetch mentors from Firestore
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        // Log fetched data for debugging
        console.log("Fetched users:", snapshot.docs.map((doc) => doc.data()));

        // Ensure the role and domain fields are properly fetched
        const mentorsList = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Unknown",
              email: data.email || "No Email",
              photoURL: data.photoURL || "",
              role: data.role || "",
              domain: data.details?.domain || "Not Specified", // Fetch domain from details
              experience: data.details?.experience || "Not Specified",
              expertise: data.details?.expertise || "Not Specified",
              availableTimeSlots: data.details?.availableTimeSlots || [], // Fetch availableTimeSlots from details
              rating: data.details?.rating || 0, // Fetch rating from details
            } as Mentor;
          })
          .filter((u) => u.role === "mentor"); // Filter only mentors

        console.log("Filtered mentors:", mentorsList); // Log filtered mentors
        setMentors(mentorsList);
        setFilteredMentors(mentorsList); // Initialize filtered mentors
      } catch (error) {
        console.error("Error fetching mentors:", error);
      }
    };

    fetchMentors();
  }, []);

  // Fetch booked sessions for the mentee
  useEffect(() => {
    const fetchBookedSessions = async () => {
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
          const date =
            data.date?.toDate?.() || // If it's a Firestore Timestamp, convert to Date
            new Date(data.date); // If it's a string, convert to Date

          return {
            id: doc.id,
            mentorName: data.mentorName,
            date: date.toLocaleString(), // Convert Date to readable string
            timeSlot: data.timeSlot,
          };
        }) as Session[];

        console.log("Fetched booked sessions for mentee:", sessionsList);
        setBookedSessions(sessionsList);
      } catch (error) {
        console.error("Error fetching booked sessions for mentee:", error);
      }
    };

    fetchBookedSessions();
  }, [user]);

  // Fetch ongoing meetings
  useEffect(() => {
    const fetchOngoingMeetings = async () => {
      try {
        const meetingsRef = collection(db, "videoRooms");
        const snapshot = await getDocs(meetingsRef);

        const meetingsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          roomId: doc.id,
          mentorName: doc.data().mentorName,
          createdAt: doc.data().createdAt?.toDate()?.toLocaleString() || "Unknown",
        })) as Meeting[];

        setOngoingMeetings(meetingsList);
      } catch (error) {
        console.error("Error fetching ongoing meetings:", error);
      }
    };

    fetchOngoingMeetings();
  }, []);

  // Fetch attended meetings from Firestore
  useEffect(() => {
    const fetchAttendedMeetings = async () => {
      try {
        const meetingsRef = collection(db, "videoRooms");
        const q = query(meetingsRef, where("status", "==", "attended"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedMeetings = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Meeting[];
          setAttendedMeetings(fetchedMeetings);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching attended meetings:", error);
      }
    };

    fetchAttendedMeetings();
  }, []);

  // Filter mentors based on search query
  useEffect(() => {
    const filtered = mentors.filter((mentor) =>
      mentor.domain.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMentors(filtered);
  }, [searchQuery, mentors]);

  useEffect(() => {
    if (selectedMentor) {
      setMentorTimeSlots(selectedMentor.availableTimeSlots || []); // Fetch mentor's time slots
    }
  }, [selectedMentor]);

  useEffect(() => {
    const fetchMentorTimeSlots = async () => {
      if (!selectedMentor) return;

      try {
        const mentorRef = doc(db, "users", selectedMentor.id);
        const mentorSnap = await getDoc(mentorRef);

        if (mentorSnap.exists()) {
          const mentorData = mentorSnap.data();
          setMentorTimeSlots(mentorData.availableTimeSlots || []); // Fetch and set available time slots
        } else {
          console.error("Mentor data not found in Firestore.");
          setMentorTimeSlots([]); // Reset time slots if mentor data is not found
        }
      } catch (error) {
        console.error("Error fetching mentor time slots:", error);
        setMentorTimeSlots([]); // Reset time slots on error
      }
    };

    fetchMentorTimeSlots();
  }, [selectedMentor]);

  const handleBooking = async () => {
    if (!selectedMentor || !selectedDate || !selectedTime || !user) return;

    setLoading(true);

    try {
      // Save booking details to Firestore
      const bookingRef = collection(db, "bookings");
      await addDoc(bookingRef, {
        menteeId: user.uid,
        menteeName: user.displayName,
        mentorId: selectedMentor.id,
        mentorName: selectedMentor.name,
        date: selectedDate.toISOString(), // Fixed syntax error
        timeSlot: selectedTime,
        createdAt: serverTimestamp(),
      });

      // Send a message to the mentor
      const messagesRef = collection(db, "messages");
      await addDoc(messagesRef, {
        text: `You have a new mentoring session booked by ${user.displayName} on ${format(
          selectedDate,
          "yyyy-MM-dd"
        )} at ${selectedTime}.`,
        userId: selectedMentor.id,
        username: selectedMentor.name,
        timestamp: serverTimestamp(),
      });

      // Send a notification to the mentor
      const notificationsRef = collection(db, "notifications");
      await addDoc(notificationsRef, {
        mentorId: selectedMentor.id,
        menteeName: user.displayName,
        date: selectedDate.toISOString(), // Fixed syntax error
        timeSlot: selectedTime,
        message: `You have a new session booked by ${user.displayName} on ${format(
          selectedDate,
          "yyyy-MM-dd"
        )} at ${selectedTime}.`,
        read: false, // Mark notification as unread
        createdAt: serverTimestamp(),
      });

      alert("Session booked successfully!");
      setSelectedMentor(null);
      setSelectedDate(undefined);
      setSelectedTime("");
    } catch (error) {
      console.error("Error booking session:", error);
      alert("Failed to book session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter meetings into ongoing, attended, and missed categories
  const today = new Date();
  const ongoingMeetingsFiltered = ongoingMeetings.filter(
    (meeting) => {
      const meetingDate = meeting.createdAt instanceof Timestamp
        ? meeting.createdAt.toDate()
        : new Date(meeting.createdAt);
      return meetingDate.toDateString() === today.toDateString() && !meeting.attended;
    }
  );

  // Ensure proper handling of the 'attended' field and Firestore Timestamp
  const attendedMeetingsFiltered = ongoingMeetings.filter((meeting) => {
    const meetingDate = meeting.createdAt instanceof Timestamp
      ? meeting.createdAt.toDate()
      : new Date(meeting.createdAt);
    return meetingDate <= today && meeting.attended; // Correctly filter attended meetings
  });

  const missedMeetings = ongoingMeetings.filter((meeting) => {
    const meetingDate = meeting.createdAt instanceof Timestamp
      ? meeting.createdAt.toDate()
      : new Date(meeting.createdAt);
    return meetingDate < today && !meeting.attended;
  });

  // Ensure proper type annotations and error handling for updateMeetingStatus
  const updateMeetingStatus = async (meetingId: string, status: string) => {
    try {
      const meetingRef = doc(db, "videoRooms", meetingId);
      await updateDoc(meetingRef, { status });
      console.log(`Meeting ${meetingId} status updated to ${status}`);
    } catch (error) {
      console.error(`Error updating meeting ${meetingId} status to ${status}:`, error);
    }
  };

  // Categorize meetings and update their status in Firestore
  useEffect(() => {
    const categorizeMeetings = async () => {
      const today = new Date();

      ongoingMeetings.forEach(async (meeting) => {
        const meetingDate = new Date(meeting.createdAt.toString());

        if (meetingDate.toDateString() === today.toDateString() && !meeting.attended) {
          await updateMeetingStatus(meeting.id, "ongoing");
        } else if (meetingDate <= today && meeting.attended) {
          await updateMeetingStatus(meeting.id, "attended");
        } else if (meetingDate < today && !meeting.attended) {
          await updateMeetingStatus(meeting.id, "missed");
        }
      });
    };

    categorizeMeetings();
  }, [ongoingMeetings]);

  // Ensure meeting status is updated only once and persists in the database
  useEffect(() => {
    const categorizeMeetings = async () => {
      const today = new Date();

      ongoingMeetings.forEach(async (meeting) => {
        const meetingDate = meeting.createdAt instanceof Timestamp
          ? meeting.createdAt.toDate()
          : new Date(meeting.createdAt);

        if (meetingDate.toDateString() === today.toDateString() && meeting.status !== "ongoing") {
          await updateMeetingStatus(meeting.id, "ongoing");
        } else if (meetingDate <= today && meeting.attended && meeting.status !== "attended") {
          await updateMeetingStatus(meeting.id, "attended");
        } else if (meetingDate < today && !meeting.attended && meeting.status !== "missed") {
          await updateMeetingStatus(meeting.id, "missed");
        }
      });
    };

    categorizeMeetings();
  }, [ongoingMeetings]);

  // Ensure meeting status is updated only when necessary
  useEffect(() => {
    const categorizeMeetings = async () => {
      const today = new Date();

      ongoingMeetings.forEach(async (meeting) => {
        const meetingDate = meeting.createdAt instanceof Timestamp
          ? meeting.createdAt.toDate()
          : new Date(meeting.createdAt);

        if (meeting.status === "attended" || meeting.status === "missed") {
          // Skip updating if the status is already attended or missed
          return;
        }

        if (meetingDate.toDateString() === today.toDateString() && meeting.status !== "ongoing") {
          await updateMeetingStatus(meeting.id, "ongoing");
        } else if (meetingDate < today && meeting.attended && meeting.status !== "attended") {
          await updateMeetingStatus(meeting.id, "attended");
        } else if (meetingDate < today && !meeting.attended && meeting.status !== "missed") {
          await updateMeetingStatus(meeting.id, "missed");
        }
      });
    };

    categorizeMeetings();
  }, [ongoingMeetings]);

  const handleJoinMeeting = async (meetingId: string) => {
    try {
      const meetingRef = doc(db, "videoRooms", meetingId);
      await updateDoc(meetingRef, { attended: true }); // Update attended status
      await updateDoc(meetingRef, { status: "attended" });
      console.log("Meeting status updated to attended");
    } catch (error) {
      console.error("Error updating meeting status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Book a Mentoring Session</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search mentors by domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Ongoing Meetings */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Ongoing Meetings</h2>
          {ongoingMeetingsFiltered.length > 0 ? (
            <ul className="space-y-4">
              {ongoingMeetingsFiltered.map((meeting) => (
                <li key={meeting.id} className="p-4 bg-white rounded-lg shadow-sm border">
                  <p className="font-semibold">Mentor: {meeting.mentorName}</p>
                  <p>Room ID: {meeting.roomId}</p>
                  <p>Scheduled At: {meeting.createdAt.toString()}</p>
                  <a
                    href={`https://meet.jit.si/${meeting.roomId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                    onClick={() => handleJoinMeeting(meeting.id)}
                  >
                    Join Meeting
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No ongoing meetings</p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Attended Meetings</h2>
          {attendedMeetingsFiltered.length > 0 ? (
            <ul className="space-y-4">
              {attendedMeetingsFiltered.map((meeting) => (
                <li key={meeting.id} className="p-4 bg-white rounded-lg shadow-sm border">
                  <p className="font-semibold">Mentor: {meeting.mentorName}</p>
                  <p>Room ID: {meeting.roomId}</p>
                  <p>Attended At: {meeting.createdAt.toString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No attended meetings</p>
          )}
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Missed Meetings</h2>
          {missedMeetings.length > 0 ? (
            <ul className="space-y-4">
              {missedMeetings.map((meeting) => (
                <li key={meeting.id} className="p-4 bg-white rounded-lg shadow-sm border">
                  <p className="font-semibold">Mentor: {meeting.mentorName}</p>
                  <p>Room ID: {meeting.roomId}</p>
                  <p>Missed At: {meeting.createdAt.toString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No missed meetings</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mentor Selection */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Choose a Mentor</h2>
            <div className="space-y-4">
              {filteredMentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedMentor?.id === mentor.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedMentor(mentor)}
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                      <AvatarFallback>{mentor.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{mentor.name}</h3>
                      <p className="text-sm text-gray-500">{mentor.email}</p>
                      <p className="text-sm text-gray-400">Domain: {mentor.domain}</p> {/* Display domain */}
                      <p className="text-sm text-gray-400">Experience: {mentor.experience}</p>
                      <p className="text-sm text-gray-400">Expertise: {mentor.expertise}</p>
                    </div>
                  </div>
                  {selectedMentor?.id === mentor.id && (
                    <RateMentor mentorId={mentor.id} mentorName={mentor.name} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar and Time Selection */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Select Date</h2>
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="border rounded-lg p-4"
              />
            </div>

            {selectedDate && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Select Time</h2>
                {mentorTimeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {mentorTimeSlots.map((time) => (
                      <button
                        key={time}
                        className={`p-2 text-sm rounded-md border transition-colors ${
                          selectedTime === time
                            ? "border-primary bg-primary text-white"
                            : "border-gray-200 hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No available time slots for this mentor.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            disabled={!selectedDate || !selectedMentor || !selectedTime || loading}
            onClick={handleBooking}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {loading ? "Booking..." : "Book Session"}
          </Button>
        </div>

        {/* Recommended Mentors */}
        {searchQuery && <RecommendedMentors domain={searchQuery} />}

        {/* Top Mentors Section */}
        <TopMentors />
      </div>
    </div>
  );
}

const RecommendedMentors: React.FC<{ domain: string }> = ({ domain }) => {
  const [mentors, setMentors] = useState<Mentor[]>([]);

  useEffect(() => {
    const fetchTopMentors = async () => {
      if (!domain) return;

      try {
        const mentorsRef = collection(db, "users");
        const q = query(
          mentorsRef,
          where("role", "==", "mentor"),
          where("domain", "==", domain)
        );

        const snapshot = await getDocs(q);
        const fetchedMentors = snapshot.docs.map((doc) => {
          const data = doc.data();
          const ratings = data.ratings || [];
          const highRatingFrequency = ratings.filter((r: number) => r >= 4).length; // Count ratings >= 4

          return {
            id: doc.id,
            name: data.name,
            photoURL: data.photoURL,
            domain: data.domain,
            experience: data.experience,
            expertise: data.expertise,
            ratings,
            highRatingFrequency,
          };
        });

        // Sort mentors by the frequency of high ratings (descending)
        const sortedMentors = fetchedMentors.sort(
          (a, b) => b.highRatingFrequency - a.highRatingFrequency
        );

        setMentors(sortedMentors.slice(0, 5)); // Limit to top 5 mentors
      } catch (error) {
        console.error("Error fetching top mentors:", error);
      }
    };

    fetchTopMentors();
  }, [domain]);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">Top Mentors for {domain}</h2>
      {mentors.length > 0 ? (
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
                  <p className="text-sm text-gray-400">Experience: {mentor.experience} years</p>
                  <p className="text-sm text-yellow-500">
                    High Ratings: {mentor.highRatingFrequency}
                  </p>
                </div>
              </div>
              <Button className="mt-4 w-full bg-blue-500 text-white">View Profile</Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No top mentors found for this domain.</p>
      )}
    </div>
  );
};

const TopMentors: React.FC = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);

  useEffect(() => {
    const fetchTopMentors = async () => {
      try {
        const mentorsRef = collection(db, "users");
        const q = query(mentorsRef);

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

        // Sort mentors by the frequency of high ratings (descending)
        const sortedMentors = fetchedMentors.sort(
          (a, b) => b.highestFrequencyRating - a.highestFrequencyRating
        );

        setMentors(sortedMentors.slice(0, 5)); // Limit to top 5 mentors
      } catch (error) {
        console.error("Error fetching top mentors:", error);
      }
    };

    fetchTopMentors();
  }, []);

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">Top Mentors</h2>
      {mentors.length > 0 ? (
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
      ) : (
        <p className="text-gray-500">No top mentors found.</p>
      )}
    </div>
  );
};

export default RecommendedMentors;
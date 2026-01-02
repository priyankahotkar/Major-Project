import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { collection, getDocs, query, where, orderBy, doc, addDoc, serverTimestamp, getDoc, updateDoc, Timestamp, onSnapshot, arrayUnion } from "firebase/firestore";
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, Search, Star, TrendingUp, Video, CheckCircle, XCircle } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

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
    <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <Star className="w-5 h-5 text-amber-500" />
        Rate {mentorName}
      </h3>
      <div className="flex space-x-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={`p-2 rounded-full transition-all transform hover:scale-110 ${
              rating === star ? "bg-amber-400 text-white shadow-md" : "bg-gray-200 text-gray-600"
            }`}
            onClick={() => setRating(star)}
          >
            <Star className={`w-6 h-6 ${rating === star ? "fill-current" : ""}`} />
          </button>
        ))}
      </div>
      <Button
        size="sm"
        onClick={handleRatingSubmit}
        disabled={submitted}
        className="w-full"
      >
        {submitted ? "✓ Submitted" : "Submit Rating"}
      </Button>
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
  const [, setBookedSessions] = useState<Session[]>([]);
  const [ongoingMeetings, setOngoingMeetings] = useState<Meeting[]>([]);
  const [mentorTimeSlots, setMentorTimeSlots] = useState<string[]>([]); // Add state for mentor's time slots
  const [, setAttendedMeetings] = useState<Meeting[]>([]); // Add state for attended meetings

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
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20 pb-6">
        <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Book a Mentoring Session
          </h1>
          <p className="text-gray-600">Find and book your perfect mentor</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-8 shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search mentors by domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </Card>

        {/* Meetings Overview - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Ongoing Meetings */}
          <Card className="border-2 border-blue-200">
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Video className="w-5 h-5" />
              Ongoing Meetings
            </CardTitle>
            <CardContent>
              {ongoingMeetingsFiltered.length > 0 ? (
                <div className="space-y-3">
                  {ongoingMeetingsFiltered.map((meeting) => (
                    <div key={meeting.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-semibold text-gray-900 mb-1">Mentor: {meeting.mentorName}</p>
                      <p className="text-sm text-gray-600 mb-2">Room: {meeting.roomId}</p>
                      <a
                        href={`https://meet.jit.si/${meeting.roomId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        onClick={() => handleJoinMeeting(meeting.id)}
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No ongoing meetings</p>
              )}
            </CardContent>
          </Card>

          {/* Attended Meetings */}
          <Card className="border-2 border-green-200">
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Attended Meetings
            </CardTitle>
            <CardContent>
              {attendedMeetingsFiltered.length > 0 ? (
                <div className="space-y-3">
                  {attendedMeetingsFiltered.map((meeting) => (
                    <div key={meeting.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-semibold text-gray-900 mb-1">Mentor: {meeting.mentorName}</p>
                      <p className="text-sm text-gray-600">Room: {meeting.roomId}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No attended meetings</p>
              )}
            </CardContent>
          </Card>

          {/* Missed Meetings */}
          <Card className="border-2 border-red-200">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Missed Meetings
            </CardTitle>
            <CardContent>
              {missedMeetings.length > 0 ? (
                <div className="space-y-3">
                  {missedMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="font-semibold text-gray-900 mb-1">Mentor: {meeting.mentorName}</p>
                      <p className="text-sm text-gray-600">Room: {meeting.roomId}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No missed meetings</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Mentor Selection */}
          <Card>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Choose a Mentor
            </CardTitle>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredMentors.length > 0 ? (
                  filteredMentors.map((mentor) => (
                    <div
                      key={mentor.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedMentor?.id === mentor.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      }`}
                      onClick={() => setSelectedMentor(mentor)}
                    >
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                          <AvatarFallback className="text-lg">{mentor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{mentor.name}</h3>
                          <p className="text-sm text-gray-500 mb-2">{mentor.email}</p>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-700 flex items-center gap-2">
                              <span className="font-medium">Domain:</span> {mentor.domain}
                            </p>
                            <p className="text-sm text-gray-700 flex items-center gap-2">
                              <span className="font-medium">Experience:</span> {mentor.experience}
                            </p>
                            <p className="text-sm text-gray-700 flex items-center gap-2">
                              <span className="font-medium">Expertise:</span> {mentor.expertise}
                            </p>
                            {mentor.rating && mentor.rating > 0 && (
                              <p className="text-sm flex items-center gap-1 text-amber-600">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="font-medium">{mentor.rating.toFixed(1)}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {selectedMentor?.id === mentor.id && (
                        <div className="mt-4 border-t pt-4">
                          <RateMentor mentorId={mentor.id} mentorName={mentor.name} />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No mentors found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calendar and Time Selection */}
          <div className="space-y-6">
            <Card>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Select Date
              </CardTitle>
              <CardContent>
                <style>{`
                  .rdp-day_selected {
                    background-color: #dbeafe !important;
                    color: #1e3a8a !important;
                    font-weight: 600 !important;
                  }
                  .rdp-day_selected:hover {
                    background-color: #bfdbfe !important;
                  }
                `}</style>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="border rounded-lg p-4 bg-gray-50"
                />
              </CardContent>
            </Card>

            {selectedDate && (
              <Card>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Select Time
                </CardTitle>
                <CardContent>
                  {mentorTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {mentorTimeSlots.map((time) => (
                        <button
                          key={time}
                          className={`p-4 text-base font-medium rounded-lg border-2 transition-all ${
                            selectedTime === time
                              ? "border-blue-500 bg-blue-500 text-white shadow-md transform scale-105"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No available time slots for this mentor.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Booking Button */}
        <div className="mb-8 flex justify-center">
          <Button
            size="lg"
            disabled={!selectedDate || !selectedMentor || !selectedTime || loading}
            onClick={handleBooking}
            className="px-12 py-6 text-lg shadow-lg hover:shadow-xl transition-all text-white"
          >
            <CalendarIcon className="mr-2 h-5 w-5" />
            {loading ? "Booking..." : "Book Session"}
          </Button>
        </div>

        {/* Recommended Mentors */}
        {searchQuery && <RecommendedMentors domain={searchQuery} />}

        {/* Top Mentors Section */}
        <TopMentors />
        </div>
      </main>
      <Footer />
    </>
  );
}

interface RecommendedMentor {
  id: string;
  name: string;
  photoURL: string;
  domain: string;
  experience: string;
  expertise: string;
  ratings: number[];
  highRatingFrequency: number;
}

const RecommendedMentors: React.FC<{ domain: string }> = ({ domain }) => {
  const [mentors, setMentors] = useState<RecommendedMentor[]>([]);

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
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Top Mentors for {domain}</h2>
      </div>
      {mentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                    <AvatarFallback className="text-lg">{mentor.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{mentor.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{mentor.expertise}</p>
                    <p className="text-sm text-gray-500 mb-2">Experience: {mentor.experience}</p>
                    <div className="flex items-center gap-2 text-amber-600">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{mentor.highRatingFrequency} High Ratings</span>
                    </div>
                  </div>
                </div>
                <Button className="mt-4 w-full" variant="outline">View Profile</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No top mentors found for this domain.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface TopMentor {
  id: string;
  name: string;
  photoURL: string;
  domain: string;
  experience: string;
  expertise: string;
  highestFrequencyRating: number;
}

const TopMentors: React.FC = () => {
  const [mentors, setMentors] = useState<TopMentor[]>([]);

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
          const highestFrequencyRating = Number(Object.keys(ratingFrequency).reduce((a, b) => {
            return ratingFrequency[Number(a)] > ratingFrequency[Number(b)] ? a : b;
          }, "1"));

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
          (a, b) => (b.highestFrequencyRating || 0) - (a.highestFrequencyRating || 0)
        );

        setMentors(sortedMentors.slice(0, 5)); // Limit to top 5 mentors
      } catch (error) {
        console.error("Error fetching top mentors:", error);
      }
    };

    fetchTopMentors();
  }, []);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Star className="w-6 h-6 text-amber-500" />
        <h2 className="text-2xl font-bold text-gray-900">Top Rated Mentors</h2>
      </div>
      {mentors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <Avatar className="w-16 h-16 mx-auto mb-3">
                  <AvatarImage src={mentor.photoURL} alt={mentor.name} />
                  <AvatarFallback className="text-lg">{mentor.name[0]}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-base mb-1">{mentor.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{mentor.expertise}</p>
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < mentor.highestFrequencyRating ? 'fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No top mentors found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecommendedMentors;
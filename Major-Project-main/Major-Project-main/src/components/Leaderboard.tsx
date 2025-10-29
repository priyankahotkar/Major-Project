import { useEffect, useState } from "react";
import { db } from "@/firebase"; // adjust the path if needed
import { collection, getDocs, query, where } from "firebase/firestore";

interface Mentor {
  id: string;
  name: string;
  sessions: number;
  rating: number;
}

const Leaderboard = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);

        let leaderboard: Mentor[] = [];

        for (let docSnap of usersSnapshot.docs) {
          const userData = docSnap.data();
          if (userData.role === "mentor") {
            const mentorId = docSnap.id;

            // Count sessions
            const sessionsRef = collection(db, "bookings");
            const sessionsQuery = query(sessionsRef, where("mentorId", "==", mentorId));
            const sessionsSnapshot = await getDocs(sessionsQuery);
            const totalSessions = sessionsSnapshot.size;

            // Get ratings
            const feedbackRef = collection(db, "feedback");
            const feedbackQuery = query(feedbackRef, where("mentorId", "==", mentorId));
            const feedbackSnapshot = await getDocs(feedbackQuery);

            let avgRating = 0;
            if (!feedbackSnapshot.empty) {
              const ratings = feedbackSnapshot.docs.map((fb) => {
                const data = fb.data();
                // Handle multiple possible rating field names and convert to number
                return Number(data.rating ?? data.stars ?? data.score ?? 0);
              });
              const validRatings = ratings.filter((r) => !isNaN(r) && r > 0);
              if (validRatings.length > 0) {
                avgRating =
                  validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
              }
            }

            leaderboard.push({
              id: mentorId,
              name: userData.name || "Unknown Mentor",
              sessions: totalSessions,
              rating: avgRating,
            });
          }
        }

        // Sort mentors: first by sessions (desc), then by rating (desc)
        leaderboard.sort((a, b) => b.sessions - a.sessions || b.rating - a.rating);

        setMentors(leaderboard);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <p>Loading Leaderboard...</p>;

  return (
    <div className="p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">🏆 Mentor Leaderboard</h2>
      {mentors.length > 0 ? (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Rank</th>
              <th className="border p-2">Mentor</th>
              <th className="border p-2">Sessions</th>
              <th className="border p-2">Rating</th>
            </tr>
          </thead>
          <tbody>
            {mentors.map((mentor, index) => (
              <tr key={mentor.id} className="text-center">
                <td className="border p-2">{index + 1}</td>
                <td className="border p-2">{mentor.name}</td>
                <td className="border p-2">{mentor.sessions}</td>
                <td className="border p-2">
                  {mentor.rating > 0 ? mentor.rating.toFixed(1) : "No Rating"} ⭐
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No mentors found.</p>
      )}
    </div>
  );
};

export default Leaderboard;

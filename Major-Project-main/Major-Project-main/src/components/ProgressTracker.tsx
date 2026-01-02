import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

const ProgressTracker = () => {
  const { user } = useAuth();
  const [attendedSessions, setAttendedSessions] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      try {
        const bookingsRef = collection(db, "bookings");
        const q = query(bookingsRef, where("menteeId", "==", user.uid));
        const snapshot = await getDocs(q);

        let total = 0;
        let completed = 0;

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          total++;
          if (data.status === "completed") {
            completed++;
          }
        });

        setTotalSessions(total);
        setAttendedSessions(completed);
      } catch (error) {
        console.error("Error fetching progress:", error);
      }
    };

    fetchProgress();
  }, [user]);

  const progress = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-2">📊 Your Progress</h2>
      <p>
        Sessions Attended: <strong>{attendedSessions}</strong> / {totalSessions}
      </p>
      <div className="w-full bg-gray-200 rounded h-4 mt-2">
        <div
          className="bg-blue-500 h-4 rounded"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="mt-2 text-sm text-gray-600">{progress.toFixed(1)}% Completed</p>
    </div>
  );
};

export default ProgressTracker;

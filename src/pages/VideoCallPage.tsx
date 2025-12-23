import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import JitsiMeet from "../components/JitsiMeet";

export function VideoCallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showNotification } = useNotification();

  useEffect(() => {
    const handleRoomLogic = async () => {
      if (!sessionId) {
        if (role === "mentor") {
          // Generate a new room for mentors
          const newRoomId = `mentor-room-${uuidv4()}`;
          try {
            const roomRef = doc(db, "videoRooms", newRoomId);
            await setDoc(roomRef, {
              mentorId: user?.uid,
              mentorName: user?.displayName || "Unknown Mentor",
              createdAt: serverTimestamp(),
            });
            showNotification({
              title: 'Video Call',
              message: 'Video call room created successfully'
            });
            navigate(`/video-call/${newRoomId}`);
          } catch (error) {
            console.error("Error creating room:", error);
            showNotification({
              title: 'Error',
              message: 'Failed to create video call room'
            });
          }
        } else {
          // Redirect mentees to their dashboard if no room ID is provided
          console.error("No room ID provided for mentee.");
          navigate("/dashboard");
        }
      } else if (role === "mentee") {
        // Ensure mentees can only join existing rooms
        showNotification({
          title: 'Video Call',
          message: 'Joining video call room...'
        });
      }
    };

    handleRoomLogic();

    return () => {
      console.log("Cleaning up video call resources...");
      showNotification({
        title: 'Video Call',
        message: 'Video call ended'
      });
    };
  }, [sessionId, role, user, navigate]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-blue-500">Processing room logic...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <JitsiMeet roomName={sessionId} />
    </div>
  );
}

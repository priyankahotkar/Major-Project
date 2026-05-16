import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
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
      if (!sessionId || !user?.uid) {
        console.log("[VIDEO] Missing sessionId or user:", { sessionId, uid: user?.uid });
        return;
      }

      try {
        console.log("[VIDEO] Processing room logic for sessionId:", sessionId);
        const roomRef = doc(db, "videoRooms", sessionId);
        const roomSnap = await getDoc(roomRef);

        console.log("[VIDEO] Room exists:", roomSnap.exists());

        if (!roomSnap.exists()) {
          // Parse sessionId if it's in format "mentorId-menteeId"
          const parts = sessionId.split("-");
          console.log("[VIDEO] Room ID parts:", parts, "Length:", parts.length);
          
          let mentorId: string | undefined;
          let menteeId: string | undefined;

          // If parts.length === 2, it's mentor-mentee format
          // Otherwise, generate IDs based on current user role
          if (parts.length === 2) {
            mentorId = parts[0];
            menteeId = parts[1];
            console.log("[VIDEO] Parsed from ID - MentorId:", mentorId, "MenteeId:", menteeId);
          } else {
            // If not in standard format, generate based on current user
            if (role === "mentor") {
              mentorId = user.uid;
              menteeId = undefined; // Will be filled when mentee joins
            } else {
              menteeId = user.uid;
              mentorId = undefined;
            }
          }

          // Determine current user's role in this room
          const currentUserIsMentor = role === "mentor" || user.uid === mentorId;

          const roomData: any = {
            attended: true,
            status: "attended",
            createdAt: serverTimestamp(),
            lastJoinedAt: serverTimestamp(),
            participantIds: [user.uid],
          };

          if (mentorId) {
            roomData.mentorId = mentorId;
            roomData.mentorName = currentUserIsMentor ? (user.displayName || "Unknown Mentor") : "Mentor";
          }

          if (menteeId) {
            roomData.menteeId = menteeId;
            roomData.menteeName = !currentUserIsMentor ? (user.displayName || "Unknown Mentee") : "Mentee";
            roomData.menteeIds = [menteeId]; // Explicitly set menteeIds array
          }

          console.log("[VIDEO] Creating room with data:", roomData);
          await setDoc(roomRef, roomData);
          console.log("[VIDEO] Room created successfully");

          showNotification({
            title: 'Video Call',
            message: 'Video call room created successfully'
          });
        } else {
          // Room exists, update it to mark as attended
          const existingData = roomSnap.data();
          console.log("[VIDEO] Existing room data:", existingData);

          const existingParticipants = existingData?.participantIds || [];
          const updatedParticipants = existingParticipants.includes(user.uid)
            ? existingParticipants
            : [...existingParticipants, user.uid];

          // Ensure menteeIds is properly set
          let updatedMenteeIds = existingData?.menteeIds || [];
          
          // If user is mentee and not in menteeIds, add them
          if (role === "mentee" && !updatedMenteeIds.includes(user.uid)) {
            updatedMenteeIds = [...updatedMenteeIds, user.uid];
          }

          // If we can extract mentee ID from room ID format "mentorId-menteeId"
          if (updatedMenteeIds.length === 0 && sessionId.includes("-")) {
            const parts = sessionId.split("-");
            if (parts.length === 2) {
              const possibleMenteeId = parts[1];
              if (possibleMenteeId && !updatedMenteeIds.includes(possibleMenteeId)) {
                updatedMenteeIds = [possibleMenteeId];
                console.log("[VIDEO] Extracted menteeId from room ID:", possibleMenteeId);
              }
            }
          }

          const updateData: any = {
            attended: true,
            status: "attended",
            participantIds: updatedParticipants,
            lastJoinedAt: serverTimestamp(),
          };

          if (updatedMenteeIds.length > 0) {
            updateData.menteeIds = updatedMenteeIds;
          }

          console.log("[VIDEO] Updating room with data:", updateData);
          await updateDoc(roomRef, updateData);
          console.log("[VIDEO] Room updated successfully");

          showNotification({
            title: 'Video Call',
            message: 'Joined video call successfully'
          });
        }
      } catch (error) {
        console.error("[VIDEO] Error handling room logic:", error);
        showNotification({
          title: 'Error',
          message: 'Failed to join video call. Check console for details.'
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
  }, [sessionId, role, user, showNotification]);

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

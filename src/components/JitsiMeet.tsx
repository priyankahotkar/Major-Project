import React from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";

const JitsiMeet = ({ roomName }: { roomName: string }) => {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <JitsiMeeting
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          startWithVideoMuted: true,
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
        }}
        userInfo={{
          displayName: "Guest User",
        }}
        getIFrameRef={(iframe) => {
          iframe.style.height = "100vh";
          iframe.style.width = "100%";
        }}
      />
    </div>
  );
};

export default JitsiMeet;

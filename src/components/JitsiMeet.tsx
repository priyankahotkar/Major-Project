import { JitsiMeeting } from "@jitsi/react-sdk";

interface JitsiMeetProps {
  roomName: string;
  isVoiceOnly?: boolean;
}

const JitsiMeet = ({ roomName, isVoiceOnly = false }: JitsiMeetProps) => {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <JitsiMeeting
        roomName={roomName}
        configOverwrite={{
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          disableVideo: isVoiceOnly,
          prejoinPageEnabled: !isVoiceOnly,
          toolbarButtons: isVoiceOnly ? [
            'microphone',
            'chat',
            'raisehand',
            'fullscreen',
            'hangup',
            'settings'
          ] : undefined,
        }}
        interfaceConfigOverwrite={{
          SHOW_JITSI_WATERMARK: false,
        }}
        userInfo={{
          displayName: "Guest User",
          email: "guest@example.com"
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

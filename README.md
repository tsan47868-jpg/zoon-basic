# ConnectCall — video meeting starter

A small multi-page video meeting web app starter. It includes a landing page, meeting room, meeting scheduler, settings page, emoji picker, local chat UI, participant list, camera/microphone controls, screen sharing, invite links, and WebRTC peer connections.

## Run locally

1. Install Node.js 18 or newer.
2. Unzip this folder and open a terminal inside it.
3. Run:

   ```bash
   npm install
   npm start
   ```

4. Open http://localhost:3000 in Chrome or Edge.
5. Open the same meeting link in another browser/device to test joining.

## Important notes

- This is a starter/demo, not a complete Zoom replacement.
- Real video/audio uses WebRTC. The included WebSocket server handles basic room signaling.
- For calls across different networks, deploy the Node server over HTTPS/WSS and add TURN servers (STUN alone is not reliable behind every firewall/NAT).
- The included chat and emoji tray are currently local UI only; they are not broadcast to other participants. The scheduler and settings are stored in browser localStorage.
- The demo supports up to 8 participants per room. A production app needs authentication, moderation, persistent chat, server-side scheduling, robust reconnect handling, TURN infrastructure, privacy controls, rate limiting, and monitoring.
- Camera/microphone and screen share require a secure context: localhost is allowed for development; deployed sites must use HTTPS.
- This is an independent starter and is not affiliated with or endorsed by Zoom.

## Pages

- `/` — Home / join or create a meeting
- `/meeting.html?room=ROOM_CODE&name=YOUR_NAME` — Meeting room
- `/schedule.html` — Local meeting scheduler
- `/settings.html` — Local user preferences

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, service: "Connect Call signaling" }));

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function broadcast(roomId, data, except) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const client of room.values()) if (client !== except) send(client, data);
}

wss.on("connection", ws => {
  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "join") {
      const roomId = String(msg.roomId || "").trim().slice(0, 80);
      const name = String(msg.name || "Guest").trim().slice(0, 32);
      if (!roomId) return send(ws, { type: "error", message: "A meeting code is required." });

      if (!rooms.has(roomId)) rooms.set(roomId, new Map());
      const room = rooms.get(roomId);
      if (room.size >= 8) return send(ws, { type: "error", message: "This demo room is full (8 people maximum)." });

      ws.roomId = roomId;
      ws.peerId = Math.random().toString(36).slice(2, 10);
      ws.peerName = name;
      room.set(ws.peerId, ws);

      const peers = [...room.entries()]
        .filter(([id]) => id !== ws.peerId)
        .map(([id, client]) => ({ id, name: client.peerName }));
      send(ws, { type: "joined", selfId: ws.peerId, peers });
      broadcast(roomId, { type: "peer-joined", peer: { id: ws.peerId, name } }, ws);
      return;
    }

    if (!ws.roomId || !ws.peerId) return;
    if (["offer", "answer", "ice"].includes(msg.type)) {
      const target = rooms.get(ws.roomId)?.get(msg.to);
      if (target) send(target, { ...msg, from: ws.peerId, name: ws.peerName });
    }
  });

  ws.on("close", () => {
    if (!ws.roomId || !ws.peerId) return;
    const room = rooms.get(ws.roomId);
    if (!room) return;
    room.delete(ws.peerId);
    broadcast(ws.roomId, { type: "peer-left", peerId: ws.peerId });
    if (room.size === 0) rooms.delete(ws.roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Connect Call running at http://localhost:${PORT}`));

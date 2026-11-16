const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const roomId = params.get("room") || "quick-meet";
const settings = JSON.parse(localStorage.getItem("cc_settings") || "{}");
const name = params.get("name") || settings.name || localStorage.getItem("cc_name") || "Guest";
$("roomLabel").textContent = "Room: " + roomId;
$("localName").textContent = name + " (You)";
const peers = new Map(), connections = new Map();
let localStream = null, screenStream = null, socket = null, micOn = !settings.muted, cameraOn = !settings.cameraOff;
const iceConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}
function updatePeople() {
  $("peopleCount").textContent = peers.size + 1;
  $("peopleList").innerHTML = "";
  const you = document.createElement("div"); you.className = "person-row"; you.textContent = "🙂  " + name + " (You)"; $("peopleList").append(you);
  peers.forEach(p => { const el=document.createElement("div"); el.className="person-row"; el.textContent="👤  "+p.name; $("peopleList").append(el); });
}
function addMessage(sender, message, system=false) {
  const box=$("chatMessages"), el=document.createElement("div"); el.className=system?"system-message":"chat-bubble";
  if(system) el.textContent=message;
  else { const strong=document.createElement("strong"); strong.textContent=sender; const body=document.createElement("span"); body.textContent=message; el.append(strong,body); }
  box.append(el); box.scrollTop=box.scrollHeight;
}
function addVideo(id, stream, peerName) {
  let tile=document.getElementById("tile-"+id);
  if(!tile) { tile=document.createElement("div"); tile.className="video-tile"; tile.id="tile-"+id;
    const video=document.createElement("video"); video.autoplay=true; video.playsInline=true; video.id="video-"+id;
    const label=document.createElement("div"); label.className="tile-name"; label.textContent=peerName;
    tile.append(video,label); $("videoGrid").append(tile); }
  tile.querySelector("video").srcObject=stream;
}
function removePeer(id) {
  peers.delete(id); connections.get(id)?.close(); connections.delete(id);
  document.getElementById("tile-"+id)?.remove(); updatePeople();
}
async function makeConnection(peerId, initiate) {
  if(connections.has(peerId)) return connections.get(peerId);
  const pc=new RTCPeerConnection(iceConfig); connections.set(peerId,pc);
  if(localStream) localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  pc.onicecandidate=e=>{ if(e.candidate) send({type:"ice",to:peerId,candidate:e.candidate}); };
  pc.ontrack=e=>addVideo(peerId,e.streams[0],peers.get(peerId)?.name || "Guest");
  pc.onconnectionstatechange=()=>{ if(["failed","closed","disconnected"].includes(pc.connectionState)) { /* allow short network interruptions */ } };
  if(initiate) { const offer=await pc.createOffer(); await pc.setLocalDescription(offer); send({type:"offer",to:peerId,sdp:pc.localDescription}); }
  return pc;
}
function send(data) { if(socket?.readyState===WebSocket.OPEN) socket.send(JSON.stringify(data)); }
async function connectSignaling() {
  const protocol=location.protocol==="https:"?"wss:":"ws:";
  socket=new WebSocket(`${protocol}//${location.host}`);
  socket.onopen=()=>send({type:"join",roomId,name});
  socket.onmessage=async event=>{
    const msg=JSON.parse(event.data);
    if(msg.type==="joined") {
      $("connectionNote").textContent="Connected · Share the invite link to add people";
      msg.peers.forEach(async p=>{peers.set(p.id,p);await makeConnection(p.id,true);}); updatePeople();
    } else if(msg.type==="peer-joined") { peers.set(msg.peer.id,msg.peer); updatePeople(); addMessage("ConnectCall",msg.peer.name+" joined the meeting.",true); }
    else if(msg.type==="peer-left") { addMessage("ConnectCall",(peers.get(msg.peerId)?.name||"A participant")+" left.",true); removePeer(msg.peerId); }
    else if(msg.type==="offer") {
      peers.set(msg.from,{id:msg.from,name:msg.name}); updatePeople();
      const pc=await makeConnection(msg.from,false); await pc.setRemoteDescription(msg.sdp);
      const answer=await pc.createAnswer(); await pc.setLocalDescription(answer); send({type:"answer",to:msg.from,sdp:pc.localDescription});
    } else if(msg.type==="answer") { await connections.get(msg.from)?.setRemoteDescription(msg.sdp); }
    else if(msg.type==="ice") { try { await connections.get(msg.from)?.addIceCandidate(msg.candidate); } catch(e) { console.warn(e); } }
    else if(msg.type==="error") { toast(msg.message); $("connectionNote").textContent=msg.message; }
  };
  socket.onclose=()=>{ $("connectionNote").textContent="Signaling connection closed. Refresh to reconnect."; };
}
async function startMedia() {
  try {
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:true});
    $("localVideo").srcObject=localStream;
    localStream.getAudioTracks().forEach(t=>t.enabled=micOn);
    localStream.getVideoTracks().forEach(t=>t.enabled=cameraOn);
    $("micBtn").classList.toggle("off",!micOn); $("cameraBtn").classList.toggle("off",!cameraOn);
    $("localStatus").textContent=micOn?"🎙️":"🔇";
    if(!cameraOn) $("localVideo").style.opacity=".05";
    await connectSignaling();
  } catch(err) {
    toast("Camera/microphone unavailable. Check browser permissions.");
    $("connectionNote").textContent="Media permission denied or no camera found. You can still use chat.";
    await connectSignaling();
  }
}
$("micBtn").onclick=()=>{micOn=!micOn;localStream?.getAudioTracks().forEach(t=>t.enabled=micOn);$("micBtn").classList.toggle("off",!micOn);$("micBtn").querySelector("small").textContent=micOn?"Mute":"Unmute";$("localStatus").textContent=micOn?"🎙️":"🔇";};
$("cameraBtn").onclick=()=>{cameraOn=!cameraOn;localStream?.getVideoTracks().forEach(t=>t.enabled=cameraOn);$("cameraBtn").classList.toggle("off",!cameraOn);$("cameraBtn").querySelector("small").textContent=cameraOn?"Stop video":"Start video";$("localVideo").style.opacity=cameraOn?"1":".05";};
$("shareBtn").onclick=async()=>{
  if(!navigator.mediaDevices.getDisplayMedia) return toast("Screen sharing is not supported in this browser.");
  try { screenStream=await navigator.mediaDevices.getDisplayMedia({video:true}); const track=screenStream.getVideoTracks()[0];
    for(const pc of connections.values()){const sender=pc.getSenders().find(s=>s.track?.kind==="video");if(sender) await sender.replaceTrack(track);}
    $("localVideo").srcObject=screenStream; track.onended=async()=>{const cam=localStream?.getVideoTracks()[0];for(const pc of connections.values()){const sender=pc.getSenders().find(s=>s.track?.kind==="video");if(sender&&cam)await sender.replaceTrack(cam);} $("localVideo").srcObject=localStream;screenStream=null;};
  } catch(e){toast("Screen sharing cancelled.");}
};
$("chatForm").onsubmit=e=>{e.preventDefault();const value=$("chatInput").value.trim();if(!value)return;addMessage(name,value);$("chatInput").value="";toast("This starter's chat is local to this browser.");};
$("emojiTray").onclick=e=>{if(e.target.tagName==="BUTTON"){$("chatInput").value+=e.target.textContent;$("chatInput").focus();}};
$("emojiBtn").onclick=()=>{ $("sidePanel").classList.remove("hidden");$("chatPanel").classList.remove("hidden");$("peoplePanel").classList.add("hidden");document.querySelector('[data-tab="chat"]').classList.add("active");$("chatInput").focus(); };
$("chatToggle").onclick=()=>showPanel("chat"); $("peopleToggle").onclick=()=>showPanel("people");
function showPanel(tab){$("sidePanel").classList.remove("hidden");$("chatPanel").classList.toggle("hidden",tab!=="chat");$("peoplePanel").classList.toggle("hidden",tab!=="people");document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>showPanel(b.dataset.tab));
$("fullscreenBtn").onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};
$("copyInvite").onclick=async()=>{const url=location.origin+"/?room="+encodeURIComponent(roomId);try{await navigator.clipboard.writeText(url);toast("Invite link copied!");}catch{toast(url);}};
$("leaveBtn").onclick=()=>{socket?.close();connections.forEach(pc=>pc.close());localStream?.getTracks().forEach(t=>t.stop());screenStream?.getTracks().forEach(t=>t.stop());location.href="/";};
window.addEventListener("beforeunload",()=>{socket?.close();localStream?.getTracks().forEach(t=>t.stop());});
updatePeople(); startMedia();

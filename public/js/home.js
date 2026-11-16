const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
if (params.get("room")) $("roomCode").value = params.get("room");
function enter(code) {
  const name = $("displayName").value.trim() || localStorage.getItem("cc_name") || "Guest";
  if (!code.trim()) { $("roomCode").focus(); return; }
  localStorage.setItem("cc_name", name);
  location.href = `/meeting.html?room=${encodeURIComponent(code.trim())}&name=${encodeURIComponent(name)}`;
}
$("joinBtn").addEventListener("click", () => enter($("roomCode").value));
$("newBtn").addEventListener("click", () => {
  const code = "meet-" + Math.random().toString(36).slice(2, 8);
  $("roomCode").value = code; enter(code);
});
$("roomCode").addEventListener("keydown", e => { if(e.key === "Enter") enter(e.target.value); });
$("displayName").value = localStorage.getItem("cc_name") || "";

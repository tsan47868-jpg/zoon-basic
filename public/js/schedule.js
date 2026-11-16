const $ = id => document.getElementById(id);
let items = JSON.parse(localStorage.getItem("cc_meetings") || "[]");
function render() {
  $("scheduleList").innerHTML = "";
  if (!items.length) { $("scheduleList").innerHTML = '<p class="muted">No meetings scheduled yet.</p>'; return; }
  items.sort((a,b) => a.when.localeCompare(b.when)).forEach(item => {
    const el = document.createElement("div"); el.className = "schedule-item";
    const info = document.createElement("div");
    const title = document.createElement("strong"); title.textContent = item.title;
    const detail = document.createElement("div"); detail.className = "muted"; detail.textContent = new Date(item.when).toLocaleString() + " · Code: " + item.code;
    info.append(title, detail);
    const join = document.createElement("a"); join.className = "btn secondary"; join.textContent = "Join"; join.href = "/?room=" + encodeURIComponent(item.code);
    el.append(info, join); $("scheduleList").append(el);
  });
}
$("scheduleForm").addEventListener("submit", e => {
  e.preventDefault(); items.push({title:$("title").value, when:$("when").value, code:$("code").value.trim()});
  localStorage.setItem("cc_meetings", JSON.stringify(items)); e.target.reset(); render();
});
render();

const $ = id => document.getElementById(id);
const saved = JSON.parse(localStorage.getItem("cc_settings") || "{}");
$("settingName").value = saved.name || localStorage.getItem("cc_name") || "";
$("startMuted").checked = !!saved.muted;
$("startCameraOff").checked = !!saved.cameraOff;
$("quality").value = saved.quality || "standard";
$("saveSettings").onclick = () => {
  const settings = { name: $("settingName").value.trim(), muted: $("startMuted").checked, cameraOff: $("startCameraOff").checked, quality: $("quality").value };
  localStorage.setItem("cc_settings", JSON.stringify(settings));
  if(settings.name) localStorage.setItem("cc_name", settings.name);
  $("savedNote").textContent = "✓ Settings saved on this device.";
};

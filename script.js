const API_BASE = "https://mediavault-api.onrender.com";. 



const $ = (id) => document.getElementById(id);
const urlInput = $("url"), statusEl = $("status"), goBtn = $("go");
$("y").textContent = new Date().getFullYear();

function setStatus(msg, type = "") { statusEl.textContent = msg; statusEl.className = "status " + type; }

$("paste").onclick = async () => {
  try { urlInput.value = await navigator.clipboard.readText(); } catch { setStatus("Clipboard access hoyni, manually paste koro.", "err"); }
};

urlInput.addEventListener("keydown", (e) => e.key === "Enter" && goBtn.click());

goBtn.onclick = async () => {
  const url = urlInput.value.trim();
  if (!url) return setStatus("Please paste a media URL first.", "err");
  goBtn.disabled = true; $("result").classList.add("hidden");
  setStatus("Fetching media… ⏳");
  try {
    const r = await fetch(API_BASE + "/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed");
    render(url, d);
    setStatus("Ready! Choose quality to download.", "ok");
  } catch (e) {
    setStatus(e.message === "Failed to fetch" ? "Server connect hocche na (API_BASE check koro)." : e.message, "err");
  } finally { goBtn.disabled = false; }
};

function render(url, d) {
  $("thumb").src = d.thumbnail || "";
  $("thumb").style.display = d.thumbnail ? "block" : "none";
  $("title").textContent = d.title;
  $("uploader").textContent = d.uploader;
  $("caption").value = d.caption;
  const box = $("formats"); box.innerHTML = "";
  const seen = new Set();
  d.formats.forEach((f) => {
    const key = f.quality + f.ext; if (seen.has(key)) return; seen.add(key);
    const a = document.createElement("a");
    a.href = `${API_BASE}/api/download?url=${encodeURIComponent(url)}&format=${encodeURIComponent(f.id)}`;
    a.textContent = `⬇ ${f.quality} ${f.ext.toUpperCase()}` + (f.size ? ` (${(f.size / 1048576).toFixed(1)} MB)` : "");
    box.appendChild(a);
  });
  if (!box.children.length) {
    const a = document.createElement("a");
    a.href = `${API_BASE}/api/download?url=${encodeURIComponent(url)}`;
    a.textContent = "⬇ Best quality"; box.appendChild(a);
  }
  $("photoBtn").onclick = () => d.thumbnail
    ? (location.href = `${API_BASE}/api/image?src=${encodeURIComponent(d.thumbnail)}`)
    : setStatus("Ei link e photo nei.", "err");
  $("copyBtn").onclick = async () => {
    await navigator.clipboard.writeText(d.caption); setStatus("Caption copied ✅", "ok");
  };
  $("result").classList.remove("hidden");
}

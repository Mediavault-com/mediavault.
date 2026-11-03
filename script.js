const API_BASE = "https://mediavault-2-rtmg.onrender.com";

const $ = (id) => document.getElementById(id);
const enc = encodeURIComponent;
const mb = (n) => (n / 1048576).toFixed(1);
const urlInput = $("url"), statusEl = $("status"), goBtn = $("go");
$("y").textContent = new Date().getFullYear();
const setStatus = (m, t = "") => { statusEl.textContent = m; statusEl.className = "status " + t; };

/* ---------- Dark / Light ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem("mv-theme", t);
  $("theme").textContent = t === "dark" ? "☀️" : "🌙";
}
applyTheme(document.documentElement.dataset.theme || "dark");
$("theme").onclick = () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

/* ---------- 100+ languages (Google Translate) ---------- */
const LANGS = [["en","English"],["bn","বাংলা (Bengali)"],["hi","हिन्दी (Hindi)"],["ur","اردو (Urdu)"],["ar","العربية (Arabic)"],["af","Afrikaans"],["sq","Albanian"],["am","Amharic"],["hy","Armenian"],["az","Azerbaijani"],["eu","Basque"],["be","Belarusian"],["bs","Bosnian"],["bg","Bulgarian"],["ca","Catalan"],["ceb","Cebuano"],["ny","Chichewa"],["zh-CN","Chinese (Simplified)"],["zh-TW","Chinese (Traditional)"],["co","Corsican"],["hr","Croatian"],["cs","Czech"],["da","Danish"],["nl","Dutch"],["eo","Esperanto"],["et","Estonian"],["tl","Filipino"],["fi","Finnish"],["fr","French"],["fy","Frisian"],["gl","Galician"],["ka","Georgian"],["de","German"],["el","Greek"],["gu","Gujarati"],["ht","Haitian Creole"],["ha","Hausa"],["haw","Hawaiian"],["iw","Hebrew"],["hmn","Hmong"],["hu","Hungarian"],["is","Icelandic"],["ig","Igbo"],["id","Indonesian"],["ga","Irish"],["it","Italian"],["ja","Japanese"],["jw","Javanese"],["kn","Kannada"],["kk","Kazakh"],["km","Khmer"],["rw","Kinyarwanda"],["ko","Korean"],["ku","Kurdish"],["ky","Kyrgyz"],["lo","Lao"],["la","Latin"],["lv","Latvian"],["lt","Lithuanian"],["lb","Luxembourgish"],["mk","Macedonian"],["mg","Malagasy"],["ms","Malay"],["ml","Malayalam"],["mt","Maltese"],["mi","Maori"],["mr","Marathi"],["mn","Mongolian"],["my","Myanmar (Burmese)"],["ne","Nepali"],["no","Norwegian"],["or","Odia"],["ps","Pashto"],["fa","Persian"],["pl","Polish"],["pt","Portuguese"],["pa","Punjabi"],["ro","Romanian"],["ru","Russian"],["sm","Samoan"],["gd","Scots Gaelic"],["sr","Serbian"],["st","Sesotho"],["sn","Shona"],["sd","Sindhi"],["si","Sinhala"],["sk","Slovak"],["sl","Slovenian"],["so","Somali"],["es","Spanish"],["su","Sundanese"],["sw","Swahili"],["sv","Swedish"],["tg","Tajik"],["ta","Tamil"],["tt","Tatar"],["te","Telugu"],["th","Thai"],["tr","Turkish"],["tk","Turkmen"],["uk","Ukrainian"],["ug","Uyghur"],["uz","Uzbek"],["vi","Vietnamese"],["cy","Welsh"],["xh","Xhosa"],["yi","Yiddish"],["yo","Yoruba"],["zu","Zulu"]];
const langSel = $("lang");
LANGS.forEach(([c, n]) => langSel.add(new Option(n, c)));
langSel.value = localStorage.getItem("mv-lang") || "en";

function setLang(code) {
  let tries = 0;
  const t = setInterval(() => {
    const c = document.querySelector(".goog-te-combo");
    if (c) { clearInterval(t); c.value = code; c.dispatchEvent(new Event("change")); }
    else if (++tries > 40) clearInterval(t);
  }, 250);
}
langSel.onchange = () => { localStorage.setItem("mv-lang", langSel.value); setLang(langSel.value); };
window.googleTranslateElementInit = () => {
  new google.translate.TranslateElement({ pageLanguage: "en", includedLanguages: LANGS.map((l) => l[0]).join(","), autoDisplay: false }, "google_translate_element");
  if (langSel.value !== "en") setLang(langSel.value);
};
const gs = document.createElement("script");
gs.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
document.body.appendChild(gs);

/* ---------- Platform menu ---------- */
const PL = { youtube: "YouTube", instagram: "Instagram", twitter: "Twitter/X", tiktok: "TikTok", facebook: "Facebook" };
function setPlatform(p) {
  document.querySelectorAll("#menu a").forEach((a) => a.classList.toggle("active", a.dataset.p === p));
  urlInput.placeholder = `Paste ${PL[p]} link here…`;
}
document.querySelectorAll("#menu a").forEach((a) => (a.onclick = (e) => { e.preventDefault(); setPlatform(a.dataset.p); urlInput.focus(); }));
function detect(u) {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    const is = (d) => h === d || h.endsWith("." + d);
    if (is("youtube.com") || is("youtu.be")) return "youtube";
    if (is("instagram.com")) return "instagram";
    if (is("twitter.com") || is("x.com") || is("t.co")) return "twitter";
    if (is("tiktok.com")) return "tiktok";
    if (is("facebook.com") || is("fb.watch") || is("fb.com")) return "facebook";
  } catch {}
  return null;
}
urlInput.addEventListener("input", () => { const p = detect(urlInput.value.trim()); if (p) setPlatform(p); });
$("paste").onclick = async () => {
  try { urlInput.value = await navigator.clipboard.readText(); urlInput.dispatchEvent(new Event("input")); }
  catch { setStatus("Clipboard access hoyni, manually paste koro.", "err"); }
};
urlInput.addEventListener("keydown", (e) => e.key === "Enter" && goBtn.click());

/* ---------- Progress ---------- */
const pStart = (t) => { const p = $("progress"); p.classList.remove("hidden"); p.classList.add("indet"); $("ptext").textContent = t; };
const pSet = (pct, t) => { $("progress").classList.remove("indet"); $("pfill").style.width = pct + "%"; $("ptext").textContent = t; };
const pEnd = () => setTimeout(() => $("progress").classList.add("hidden"), 1500);

async function getFile(endpoint, fallbackName, label) {
  $("result").classList.add("busy");
  setStatus("");
  try {
    pStart(`${label}: server e prepare hocche… ⏳`);
    const r = await fetch(API_BASE + endpoint);
    if (!r.ok) throw new Error((await r.text()).slice(0, 140) || "Download failed");
    const total = +r.headers.get("Content-Length") || 0;
    const reader = r.body.getReader(), chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      total ? pSet(Math.round((got / total) * 100), `${label}: ${Math.round((got / total) * 100)}%  (${mb(got)} / ${mb(total)} MB)`)
            : pSet(100, `${label}: ${mb(got)} MB`);
    }
    const name = ((r.headers.get("Content-Disposition") || "").match(/filename="(.+?)"/) || [])[1] || fallbackName;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(chunks));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    pSet(100, `${label}: done ✅`); pEnd();
  } catch (e) {
    setStatus(e.message, "err"); $("progress").classList.add("hidden");
  } finally { $("result").classList.remove("busy"); }
}

/* ---------- Search ---------- */
goBtn.onclick = async () => {
  const url = urlInput.value.trim();
  if (!url) return setStatus("Please paste a media URL first.", "err");
  goBtn.disabled = true; $("result").classList.add("hidden");
  setStatus("Media khujchi… ⏳ (prothom bar 30-50 sec lagte pare)");
  try {
    const r = await fetch(API_BASE + "/api/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed");
    render(url, d);
    setStatus("Ready! Quality choose koro.", "ok");
  } catch (e) {
    setStatus(e.message === "Failed to fetch" ? "Server connect hocche na (API_BASE check koro)." : e.message, "err");
  } finally { goBtn.disabled = false; }
};

function render(url, d) {
  $("thumb").src = d.thumbnail || ""; $("thumb").style.display = d.thumbnail ? "block" : "none";
  $("title").textContent = d.title; $("uploader").textContent = d.uploader; $("caption").value = d.caption;

  const q = $("qualities"); q.innerHTML = "";
  [...d.qualities, { label: "MP3 Audio", id: "mp3" }].forEach((x) => {
    const row = document.createElement("div");
    row.className = "qrow" + (x.id ? "" : " off");
    const info = document.createElement("div");
    const b = document.createElement("b"); b.textContent = x.label;
    const s = document.createElement("small"); s.textContent = x.id ? (x.size ? `~${mb(x.size)} MB` : "Available") : "Not available";
    info.append(b, s);
    const btn = document.createElement("button");
    btn.textContent = "Download"; btn.disabled = !x.id;
    btn.onclick = () => getFile(`/api/download?url=${enc(url)}&fid=${enc(x.id)}`, `mediavault-${x.label}.mp4`, x.label);
    row.append(info, btn); q.appendChild(row);
  });

  const ph = $("photos"); ph.innerHTML = "";
  (d.photos.length ? d.photos : []).forEach((src, i) => {
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.referrerPolicy = "no-referrer"; img.src = src;
    img.onerror = () => { img.onerror = null; img.src = `${API_BASE}/api/image?src=${enc(src)}`; };
    const btn = document.createElement("button"); btn.textContent = "Download Photo";
    btn.onclick = () => getFile(`/api/image?src=${enc(src)}`, `mediavault-photo-${i + 1}.jpg`, `Photo ${i + 1}`);
    fig.append(img, btn); ph.appendChild(fig);
  });
  if (!ph.children.length) ph.textContent = "Ei link e photo nei.";

  $("copyBtn").onclick = async () => { await navigator.clipboard.writeText(d.caption); setStatus("Caption copied ✅", "ok"); };
  $("result").classList.remove("hidden");
}

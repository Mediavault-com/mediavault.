const API_BASE = "https://mediavault-2-rtmg.onrender.com";

const $ = (id) => document.getElementById(id);
const enc = encodeURIComponent;
const mb = (n) => (n / 1048576).toFixed(1);
const urlInput = $("url"), statusEl = $("status"), goBtn = $("go");
const root = document.documentElement;
$("y").textContent = new Date().getFullYear();

/* ---------- Toasts ---------- */
const ICON = { ok: "✓", err: "!", info: "i" };
function toast(msg, type = "info", ms = 4500) {
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.innerHTML = '<span class="ti"></span><span class="tm"></span><button type="button" aria-label="Close">×</button><i class="tbar"></i>';
  t.querySelector(".ti").textContent = ICON[type] || "i";
  t.querySelector(".tm").textContent = msg;
  t.querySelector(".tbar").style.animationDuration = ms + "ms";
  const close = () => { t.classList.add("out"); setTimeout(() => t.remove(), 300); };
  t.querySelector("button").onclick = close;
  $("toasts").appendChild(t);
  setTimeout(close, ms);
}
const setStatus = (m, t = "") => {
  if (t === "ok") toast(m, "ok");
  else if (t === "err") toast(m, "err", 6500);
  statusEl.textContent = t ? "" : m;
};
const setLoading = (text) => {
  statusEl.innerHTML = text ? '<span class="loader"><span class="ring"></span><span class="ltxt"></span><span class="dots"><i></i><i></i><i></i></span></span>' : "";
  if (text) statusEl.querySelector(".ltxt").textContent = text;
};

/* ---------- Dark / Light ---------- */
function applyTheme(t) {
  root.dataset.theme = t;
  localStorage.setItem("mv-theme", t);
  $("theme").textContent = t === "dark" ? "☀️" : "🌙";
}
applyTheme(root.dataset.theme || "dark");
$("theme").onclick = () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark");

/* ---------- Responsive nav ---------- */
const burger = $("burger"), navwrap = $("navwrap");
function toggleNav(open) {
  const o = open ?? !navwrap.classList.contains("open");
  navwrap.classList.toggle("open", o); burger.classList.toggle("open", o);
  burger.setAttribute("aria-expanded", o);
}
burger.onclick = () => toggleNav();
document.addEventListener("click", (e) => { if (!e.target.closest(".nav")) toggleNav(false); });

/* ---------- Page transition ---------- */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || u.pathname === location.pathname) return;
  e.preventDefault();
  document.body.classList.add("leaving");
  setTimeout(() => (location.href = a.href), 260);
});
window.addEventListener("pageshow", () => document.body.classList.remove("leaving"));

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

/* ---------- Platform menu + colour theme ---------- */
const PL = { youtube: "YouTube", instagram: "Instagram", twitter: "Twitter/X", tiktok: "TikTok", facebook: "Facebook" };
function setPlatform(p) {
  if (p) root.dataset.platform = p; else delete root.dataset.platform;
  document.querySelectorAll("#menu a").forEach((a) => a.classList.toggle("active", a.dataset.p === p));
  urlInput.placeholder = p ? `Paste ${PL[p]} link here…` : "Paste media link here…";
}
document.querySelectorAll("[data-p]").forEach((a) => {
  if (a.tagName !== "A") return;
  a.onclick = (e) => {
    e.preventDefault(); setPlatform(a.dataset.p); toggleNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" }); urlInput.focus({ preventScroll: true });
  };
});
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
  try { urlInput.value = await navigator.clipboard.readText(); urlInput.dispatchEvent(new Event("input")); toast("Link pasted", "info", 1800); }
  catch { toast("Clipboard access hoyni, manually paste koro.", "err"); }
};
urlInput.addEventListener("keydown", (e) => e.key === "Enter" && goBtn.click());

/* ---------- Buttons ---------- */
function mkBtn(label) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "btn-dl small"; b.dataset.label = label;
  b.innerHTML = '<span class="fill"></span><span class="ico">⬇</span><span class="lbl"></span>';
  b.querySelector(".lbl").textContent = label;
  return b;
}
function btnState(btn, cls, txt, pct) {
  if (!btn) return;
  btn.classList.remove("loading", "done", "fail");
  if (cls) btn.classList.add(cls);
  btn.querySelector(".lbl").textContent = txt;
  btn.querySelector(".ico").textContent = cls === "done" ? "✓" : cls === "fail" ? "✕" : "⬇";
  if (pct != null) btn.style.setProperty("--pct", pct + "%");
}

/* ---------- Progress + download ---------- */
const pStart = (t) => { const p = $("progress"); p.classList.remove("hidden"); p.classList.add("indet"); $("ptext").textContent = t; };
const pSet = (pct, t) => { $("progress").classList.remove("indet"); $("pfill").style.width = pct + "%"; $("ptext").textContent = t; };
const pEnd = () => setTimeout(() => $("progress").classList.add("hidden"), 1500);

async function getFile(endpoint, fallbackName, label, btn) {
  $("result").classList.add("busy");
  const orig = btn ? btn.dataset.label : "";
  try {
    btnState(btn, "loading", "Preparing…", 0);
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
      const pct = total ? Math.round((got / total) * 100) : 100;
      btnState(btn, "loading", total ? pct + "%" : mb(got) + " MB", pct);
      total ? pSet(pct, `${label}: ${pct}%  (${mb(got)} / ${mb(total)} MB)`) : pSet(100, `${label}: ${mb(got)} MB`);
    }
    const name = ((r.headers.get("Content-Disposition") || "").match(/filename="(.+?)"/) || [])[1] || fallbackName;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(chunks));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    pSet(100, `${label}: done ✅`); pEnd();
    btnState(btn, "done", "Done!", 100);
    toast(`${label} download complete`, "ok", 3500);
  } catch (e) {
    btnState(btn, "fail", "Failed", 0);
    toast(e.message, "err", 6500);
    $("progress").classList.add("hidden");
  } finally {
    $("result").classList.remove("busy");
    setTimeout(() => btnState(btn, null, orig, 0), 2500);
  }
}

/* ---------- Search ---------- */
goBtn.onclick = async () => {
  const url = urlInput.value.trim();
  if (!url) return toast("Please paste a media URL first.", "err");
  goBtn.disabled = true;
  btnState(goBtn, "loading", "Searching…");
  $("result").classList.add("hidden");
  $("skeleton").classList.remove("hidden");
  setLoading("Media khujchi… prothom bar 30-50 sec lagte pare");
  try {
    const r = await fetch(API_BASE + "/api/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed");
    render(url, d);
    toast("Ready! Quality choose koro.", "ok", 2500);
  } catch (e) {
    toast(e.message === "Failed to fetch" ? "Server connect hocche na (API_BASE check koro)." : e.message, "err", 6500);
  } finally {
    goBtn.disabled = false; btnState(goBtn, null, "Search", 0);
    $("skeleton").classList.add("hidden"); setLoading(null);
  }
};

function render(url, d) {
  $("thumb").src = d.thumbnail || ""; $("thumb").style.display = d.thumbnail ? "block" : "none";
  $("title").textContent = d.title; $("uploader").textContent = d.uploader; $("caption").value = d.caption;

  const q = $("qualities"); q.innerHTML = "";
  [...d.qualities, { label: "MP3 Audio", id: "mp3" }].forEach((x, i) => {
    const row = document.createElement("div");
    row.className = "qrow" + (x.id ? "" : " off");
    row.style.setProperty("--i", i);
    const info = document.createElement("div");
    const b = document.createElement("b"); b.textContent = x.label;
    const s = document.createElement("small"); s.textContent = x.id ? (x.size ? `~${mb(x.size)} MB` : "Available") : "Not available";
    info.append(b, s);
    const btn = mkBtn("Download"); btn.disabled = !x.id;
    btn.onclick = () => getFile(`/api/download?url=${enc(url)}&fid=${enc(x.id)}`, `mediavault-${x.label}.mp4`, x.label, btn);
    row.append(info, btn); q.appendChild(row);
  });

  const ph = $("photos"); ph.innerHTML = "";
  d.photos.forEach((src, i) => {
    const fig = document.createElement("figure");
    fig.style.setProperty("--i", i);
    const img = document.createElement("img");
    img.referrerPolicy = "no-referrer"; img.src = src;
    img.onerror = () => { img.onerror = null; img.src = `${API_BASE}/api/image?src=${enc(src)}`; };
    const btn = mkBtn("Download Photo");
    btn.onclick = () => getFile(`/api/image?src=${enc(src)}`, `mediavault-photo-${i + 1}.jpg`, `Photo ${i + 1}`, btn);
    fig.append(img, btn); ph.appendChild(fig);
  });
  if (!ph.children.length) ph.textContent = "Ei link e photo nei.";

  $("copyBtn").onclick = async () => {
    try { await navigator.clipboard.writeText(d.caption); toast("Caption copied ✅", "ok", 2500); }
    catch { toast("Copy hoyni, manually select koro.", "err"); }
  };
  $("result").classList.remove("hidden");
  setTimeout(() => $("result").scrollIntoView({ behavior: "smooth", block: "start" }), 100);
}

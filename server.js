// MediaVault API v2 — needs yt-dlp + ffmpeg (Dockerfile installs both)
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const MAX_MB = process.env.MAX_MB || "400";

// Optional: bypass Instagram/X/YouTube blocks on datacenter IPs
//   PROXY_URL = http://user:pass@host:port   (residential proxy)
//   Cookies   = Render Secret File "cookies.txt" (best), or COOKIES_B64 / COOKIES_TXT env var
const COMMON = [];
let COOKIE_COUNT = 0;

// TikTok often needs a browser-like TLS fingerprint (curl_cffi). Detect once at startup.
let IMPERSONATE_OK = false;
try {
  const r = require("child_process").spawnSync("yt-dlp", ["--list-impersonate-targets"], { encoding: "utf8", timeout: 20000 });
  IMPERSONATE_OK = (r.stdout || "").split("\n").some((l) => /chrome/i.test(l) && /curl_cffi/i.test(l) && !/unavailable/i.test(l));
} catch {}
console.log("Impersonate available:", IMPERSONATE_OK);
const extra = (u) => (IMPERSONATE_OK && /tiktok\.com/i.test(u) ? ["--impersonate", "chrome"] : []);
if (process.env.PROXY_URL) COMMON.push("--proxy", process.env.PROXY_URL);

function loadCookies() {
  let raw = "";
  try { if (fs.existsSync("/etc/secrets/cookies.txt")) raw = fs.readFileSync("/etc/secrets/cookies.txt", "utf8"); } catch {}
  if (!raw && process.env.COOKIES_B64) raw = Buffer.from(process.env.COOKIES_B64, "base64").toString("utf8");
  if (!raw && process.env.COOKIES_TXT) raw = process.env.COOKIES_TXT;
  if (!raw) return console.log("Cookies: none");
  // clean: keep only valid 7-field TAB lines, drop duplicates/blank/broken lines, add header
  const seen = new Set(), out = ["# Netscape HTTP Cookie File"];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.startsWith("#") && !line.startsWith("#HttpOnly_")) continue;
    if (line.split("\t").length !== 7 || seen.has(line)) continue;
    seen.add(line); out.push(line);
  }
  const hosts = [...new Set(out.slice(1).map((l) => l.split("\t")[0].replace(/^#HttpOnly_/, "").replace(/^\./, "")))];
  console.log(`Cookies loaded: ${out.length - 1} entries for: ${hosts.join(", ") || "-"}`);
  COOKIE_COUNT = out.length - 1;
  if (out.length > 1) {
    const cp = path.join(os.tmpdir(), "mv-cookies.txt");
    fs.writeFileSync(cp, out.join("\n") + "\n");
    COMMON.push("--cookies", cp);
  }
}


loadCookies();
const app = express();
app.set("trust proxy", 1);
app.use(cors({ exposedHeaders: ["Content-Length", "Content-Disposition"] }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 30 }));

const ALLOWED = ["facebook.com", "fb.watch", "fb.com", "tiktok.com", "twitter.com", "x.com", "t.co", "instagram.com", "youtube.com", "youtu.be"];

function validUrl(u) {
  try {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const h = url.hostname.replace(/^www\./, "");
    return ALLOWED.some((d) => h === d || h.endsWith("." + d));
  } catch { return false; }
}

function publicHost(h) {
  return !(/^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.includes(":") || h.endsWith(".internal") || h.endsWith(".local"));
}

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("yt-dlp", [...COMMON, ...args]);
    let out = "", err = "";
    const timer = setTimeout(() => { p.kill(); reject(new Error("Timeout")); }, 45_000);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(out) : reject(new Error(err.split("\n").filter(Boolean).pop() || "Failed"));
    });
  });
}

// [min short-side, label, window low, window high]
const TIERS = [["4K Ultra HD", 1500, 99999], ["1080p Full HD", 900, 1500], ["720p HD", 600, 900], ["480p SD", 420, 600], ["360p", 0, 420]];

function buildQualities(item) {
  const vids = (item.formats || [])
    .filter((f) => f.height && f.vcodec !== "none")
    .map((f) => ({ f, q: Math.min(f.width || f.height, f.height) }));
  return TIERS.map(([label, lo, hi]) => {
    const c = vids.filter((v) => v.q >= lo && v.q < hi).sort((a, b) => b.q - a.q || (b.f.tbr || 0) - (a.f.tbr || 0))[0];
    return { label, id: c ? c.f.format_id : null, size: c ? c.f.filesize || c.f.filesize_approx || null : null };
  });
}

const bestThumb = (e) => (e.thumbnails && e.thumbnails.length ? e.thumbnails[e.thumbnails.length - 1].url : e.thumbnail) || null;

/* ---------- Stats, admin, tool control ---------- */
const DATA_FILE = path.join(process.env.DATA_DIR || __dirname, "stats.json");
let DB = { visitors: {}, days: {}, recent: [], blocked: {}, disabled: {} };
try { DB = { ...DB, ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) }; } catch {}
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFile(DATA_FILE, JSON.stringify(DB), () => {}); } }, 15000);
const ALL_TOOLS = ["youtube","instagram","twitter","tiktok","facebook","json","min","html","css","re","md","color","uuid","b64","api"];
const today = () => new Date().toISOString().slice(0, 10);
const D = () => (DB.days[today()] ??= { visits: 0, users: {}, dl: 0, searches: 0, plat: {}, qual: {} });
const ipH = (r) => crypto.createHash("sha256").update((r.ip || "") + (process.env.HASH_SALT || "mv")).digest("hex").slice(0, 12);
const vidOf = (r) => String(r.headers["x-vid"] || (r.body && r.body.vid) || "").slice(0, 64);
const plat = (u) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return /youtu/.test(h) ? "youtube" : /instagram/.test(h) ? "instagram" : /(^|\.)(x|twitter)\.com$|^t\.co$/.test(h) ? "twitter" : /tiktok/.test(h) ? "tiktok" : /facebook|fb\./.test(h) ? "facebook" : "other"; } catch { return "other"; } };
const isBlocked = (r) => DB.blocked[vidOf(r)] || DB.blocked[ipH(r)];
function touch(r, page) {
  const id = vidOf(r); if (!id) return;
  const v = (DB.visitors[id] ??= { first: Date.now(), visits: 0, dl: 0 });
  v.last = Date.now(); v.ip = ipH(r);
  if (page) { v.visits++; const d = D(); d.visits++; d.users[id] = 1; }
  dirty = true;
}
function guard(req, res, url) {
  if (isBlocked(req)) { res.status(403).json({ error: "Your access has been blocked." }); return true; }
  const p = plat(url);
  if (DB.disabled[p]) { res.status(403).json({ error: `${p} is temporarily turned off.` }); return true; }
  return false;
}
function logDl(req, url, q) {
  const d = D(), p = plat(url);
  d.dl++; d.plat[p] = (d.plat[p] || 0) + 1; d.qual[q] = (d.qual[q] || 0) + 1;
  const v = DB.visitors[vidOf(req)]; if (v) v.dl++;
  DB.recent.unshift({ t: Date.now(), p, q }); DB.recent.length = Math.min(DB.recent.length, 100);
  dirty = true;
}
app.post("/api/track", (req, res) => {
  touch(req, (req.body && req.body.page) || "/");
  res.json({ blocked: !!isBlocked(req), disabled: Object.keys(DB.disabled).filter((k) => DB.disabled[k]) });
});

// Admin (set ADMIN_PASSWORD in Render > Environment)
const TOKENS = new Map();
const adminOk = (req, res, next) => {
  const t = (req.headers.authorization || "").replace("Bearer ", "");
  if ((TOKENS.get(t) || 0) > Date.now()) return next();
  res.status(401).json({ error: "Unauthorized" });
};
app.post("/api/admin/login", rateLimit({ windowMs: 60_000, max: 6 }), (req, res) => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(503).json({ error: "ADMIN_PASSWORD set kora nei (Render Environment)." });
  const a = Buffer.from(String((req.body && req.body.password) || "")), b = Buffer.from(pw);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: "Wrong password" });
  const t = crypto.randomBytes(24).toString("hex");
  TOKENS.set(t, Date.now() + 12 * 3600e3);
  res.json({ token: t });
});
app.get("/api/admin/stats", adminOk, (req, res) => {
  const keys = Object.keys(DB.days), last = [];
  for (let i = 13; i >= 0; i--) {
    const k = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), x = DB.days[k];
    last.push({ d: k.slice(5), visits: x ? x.visits : 0, users: x ? Object.keys(x.users).length : 0, dl: x ? x.dl : 0 });
  }
  const sum = (f) => keys.reduce((s, k) => s + f(DB.days[k]), 0), plat = {}, qual = {};
  keys.forEach((k) => { for (const [p, n] of Object.entries(DB.days[k].plat)) plat[p] = (plat[p] || 0) + n; for (const [q, n] of Object.entries(DB.days[k].qual)) qual[q] = (qual[q] || 0) + n; });
  const vs = Object.values(DB.visitors), start = new Date(today()).getTime();
  res.json({
    totalUsers: vs.length, newToday: vs.filter((v) => v.first >= start).length,
    active7: vs.filter((v) => v.last > Date.now() - 7 * 864e5).length, returning: vs.filter((v) => v.visits > 1).length,
    totalVisits: sum((x) => x.visits), totalDl: sum((x) => x.dl), totalSearches: sum((x) => x.searches),
    last, plat, qual, recent: DB.recent.slice(0, 30),
  });
});
app.get("/api/admin/users", adminOk, (req, res) => {
  const rows = Object.entries(DB.visitors).map(([id, v]) => ({ id, ...v, blocked: !!(DB.blocked[id] || DB.blocked[v.ip]) }))
    .sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 200);
  res.json({ users: rows });
});
app.post("/api/admin/block", adminOk, (req, res) => {
  const { id, block } = req.body || {}, v = DB.visitors[id];
  if (!v) return res.status(404).json({ error: "User not found" });
  if (block) { DB.blocked[id] = 1; DB.blocked[v.ip] = 1; } else { delete DB.blocked[id]; delete DB.blocked[v.ip]; }
  dirty = true; res.json({ ok: true });
});
app.get("/api/admin/tools", adminOk, (req, res) => res.json({ all: ALL_TOOLS, disabled: DB.disabled }));
app.post("/api/admin/tools", adminOk, (req, res) => {
  const { key, enabled } = req.body || {};
  if (!ALL_TOOLS.includes(key)) return res.status(400).json({ error: "Unknown tool" });
  if (enabled) delete DB.disabled[key]; else DB.disabled[key] = true;
  dirty = true; res.json({ ok: true });
});

app.get("/api/health", (_, res) => res.json({ ok: true, cookies: COOKIE_COUNT, proxy: !!process.env.PROXY_URL, impersonate: IMPERSONATE_OK }));

app.post("/api/info", async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Media URL dao." });
  if (!validUrl(url)) return res.status(400).json({ error: "Ei link support kore na." });
  if (guard(req, res, url)) return;
  touch(req); D().searches++; dirty = true;
  try {
    const d = JSON.parse(await runYtdlp(["-J", "--no-warnings", ...extra(url), url]));
    const entries = d.entries && d.entries.length ? d.entries : [d];
    const item = entries.find((e) => (e.formats || []).some((f) => f.height && f.vcodec !== "none")) || entries[0];
    res.json({
      title: item.title || d.title || "Untitled",
      caption: item.description || d.description || item.title || "",
      uploader: item.uploader || d.uploader || "",
      thumbnail: bestThumb(item),
      photos: [...new Set(entries.map(bestThumb).filter(Boolean))],
      qualities: buildQualities(item),
    });
  } catch (e) {
    res.status(500).json({ error: "Media paoa jayni (private/invalid link ba platform block). " + e.message });
  }
});

let active = 0;
app.get("/api/download", (req, res) => {
  const { url, fid } = req.query;
  if (!url || !validUrl(url)) return res.status(400).send("Invalid URL");
  if (guard(req, res, url)) return;
  const mp3 = fid === "mp3";
  if (!mp3 && !/^[\w\-+.]+$/.test(fid || "")) return res.status(400).send("Invalid format");
  if (active >= 2) return res.status(503).send("Server busy, 1 minute por abar try koro.");
  active++;

  const id = crypto.randomBytes(6).toString("hex");
  const tag = "mv-" + id;
  const tmp = os.tmpdir();
  const args = ["--no-playlist", "--no-warnings", "--max-filesize", MAX_MB + "M", "-o", path.join(tmp, tag + ".%(ext)s")];
  if (mp3) args.push("-x", "--audio-format", "mp3");
  else args.push("-f", `${fid}+ba/${fid}`, "--merge-output-format", "mp4");
  args.push(...extra(url), url);

  const p = spawn("yt-dlp", [...COMMON, ...args]);
  const timer = setTimeout(() => p.kill(), 180_000);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true; active--;
    fs.readdirSync(tmp).filter((f) => f.startsWith(tag)).forEach((f) => fs.unlink(path.join(tmp, f), () => {}));
  };
  res.on("close", () => { if (!res.writableFinished) p.kill(); finish(); });

  p.on("close", (code) => {
    clearTimeout(timer);
    const f = fs.readdirSync(tmp).find((x) => x.startsWith(tag));
    if (code !== 0 || !f) return res.status(500).send("Download failed (file boro hote pare ba platform block).");
    const fp = path.join(tmp, f);
    res.setHeader("Content-Length", fs.statSync(fp).size);
    res.setHeader("Content-Type", mp3 ? "audio/mpeg" : "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="mediavault-${id}.${mp3 ? "mp3" : "mp4"}"`);
    logDl(req, url, req.query.ql || (mp3 ? "MP3" : fid));
    fs.createReadStream(fp).pipe(res);
  });
});

app.get("/api/image", async (req, res) => {
  try {
    const u = new URL(req.query.src);
    if (!["http:", "https:"].includes(u.protocol) || !publicHost(u.hostname)) throw 0;
    const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !type.startsWith("image/")) throw 0;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 15 * 1048576) throw 0;
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Content-Disposition", 'attachment; filename="mediavault-photo.jpg"');
    res.send(buf);
  } catch { res.status(400).send("Invalid image"); }
});

app.listen(process.env.PORT || 3000, () => console.log("MediaVault API running"));

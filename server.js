// MediaVault API — needs yt-dlp (+ ffmpeg) installed on the server
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { spawn } = require("child_process");

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 30 }));

const ALLOWED = [
  "facebook.com", "fb.watch", "fb.com",
  "tiktok.com", "twitter.com", "x.com", "t.co",
  "instagram.com", "youtube.com", "youtu.be",
];

function validUrl(u) {
  try {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const h = url.hostname.replace(/^www\./, "");
    return ALLOWED.some((d) => h === d || h.endsWith("." + d));
  } catch { return false; }
}

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const p = spawn("yt-dlp", args);
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

app.get("/api/health", (_, res) => res.json({ ok: true }));

// Media info: title, thumbnail, caption, formats
app.post("/api/info", async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Media URL dao." });
  if (!validUrl(url)) return res.status(400).json({ error: "Ei link support kore na." });
  try {
    const json = await runYtdlp(["-J", "--no-playlist", "--no-warnings", url]);
    const d = JSON.parse(json);
    const item = d.entries ? d.entries[0] : d;
    const formats = (item.formats || [])
      .filter((f) => f.vcodec !== "none" && f.acodec !== "none" && f.url)
      .map((f) => ({ id: f.format_id, ext: f.ext, quality: f.format_note || (f.height ? f.height + "p" : "SD"), size: f.filesize || f.filesize_approx || null }));
    res.json({
      title: item.title || "Untitled",
      caption: item.description || item.title || "",
      thumbnail: item.thumbnail || null,
      uploader: item.uploader || "",
      duration: item.duration || null,
      formats,
    });
  } catch (e) {
    res.status(500).json({ error: "Media paoa jayni (private/invalid link hote pare). " + e.message });
  }
});

// Stream download
app.get("/api/download", (req, res) => {
  const { url, format } = req.query;
  if (!url || !validUrl(url)) return res.status(400).send("Invalid URL");
  const f = /^[\w\-+.]+$/.test(format || "") ? format : "best[ext=mp4]/best";
  res.setHeader("Content-Disposition", 'attachment; filename="mediavault-video.mp4"');
  res.setHeader("Content-Type", "video/mp4");
  const p = spawn("yt-dlp", ["-f", f, "--no-playlist", "-o", "-", url]);
  p.stdout.pipe(res);
  p.on("error", () => res.end());
  res.on("close", () => p.kill());
});

// Image proxy (thumbnail / photo download)
app.get("/api/image", async (req, res) => {
  const { src } = req.query;
  try {
    const u = new URL(src);
    if (!["http:", "https:"].includes(u.protocol)) throw 0;
    const r = await fetch(src);
    if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) throw 0;
    res.setHeader("Content-Disposition", 'attachment; filename="mediavault-photo.jpg"');
    res.setHeader("Content-Type", r.headers.get("content-type"));
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch { res.status(400).send("Invalid image"); }
});

app.listen(process.env.PORT || 3000, () => console.log("MediaVault API running"));

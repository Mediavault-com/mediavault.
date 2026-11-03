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

// Optional: bypass Instagram/YouTube blocks on datacenter IPs (set in Render > Environment)
//   PROXY_URL   = http://user:pass@host:port   (residential/rotating proxy)
//   COOKIES_TXT = full contents of a Netscape cookies.txt (use a throwaway account!)
const COMMON = [];
if (process.env.PROXY_URL) COMMON.push("--proxy", process.env.PROXY_URL);
if (process.env.COOKIES_TXT) {
  const cp = require("path").join(require("os").tmpdir(), "mv-cookies.txt");
  require("fs").writeFileSync(cp, process.env.COOKIES_TXT);
  COMMON.push("--cookies", cp);
}
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

app.get("/api/health", (_, res) => res.json({ ok: true }));

app.post("/api/info", async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "Media URL dao." });
  if (!validUrl(url)) return res.status(400).json({ error: "Ei link support kore na." });
  try {
    const d = JSON.parse(await runYtdlp(["-J", "--no-warnings", url]));
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
  args.push(url);

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

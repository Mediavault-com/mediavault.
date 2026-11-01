<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Media Vault - Downloader</title>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
}

body {
  background: #090d19;
  color: white;
  min-height: 100vh;
}

header {
  padding: 22px;
  text-align: center;
  background: #111a30;
  border-bottom: 1px solid #273451;
}

.logo {
  font-size: 28px;
  font-weight: bold;
  color: #a78bfa;
}

header p {
  color: #aab3c5;
  margin-top: 7px;
}

.container {
  max-width: 650px;
  margin: 35px auto;
  padding: 20px;
}

.hero {
  text-align: center;
  margin-bottom: 30px;
}

.hero h1 {
  font-size: 32px;
  margin-bottom: 12px;
}

.hero span {
  color: #a78bfa;
}

.hero p {
  color: #aab3c5;
  line-height: 1.6;
}

.download-box {
  background: #151e34;
  padding: 22px;
  border-radius: 18px;
  border: 1px solid #34415e;
}

input {
  width: 100%;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #465474;
  background: #0b1223;
  color: white;
  font-size: 15px;
  margin-bottom: 15px;
}

button {
  border: none;
  cursor: pointer;
  border-radius: 10px;
  padding: 14px;
  font-weight: bold;
}

.download-btn {
  width: 100%;
  color: white;
  background: linear-gradient(90deg,#7c3aed,#2563eb);
  font-size: 16px;
}

.download-btn:hover {
  opacity: .85;
}

.platforms {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 12px;
  margin-top: 25px;
}

.platform {
  padding: 20px 10px;
  text-align: center;
  background: #151e34;
  border: 1px solid #34415e;
  border-radius: 12px;
}

.platform b {
  display: block;
  margin-top: 8px;
}

.caption {
  margin-top: 22px;
  padding: 20px;
  border-radius: 15px;
  background: #151e34;
}

.caption textarea {
  width: 100%;
  height: 85px;
  background: #0b1223;
  color: white;
  border: 1px solid #34415e;
  padding: 12px;
  border-radius: 8px;
  margin: 12px 0;
}

.copy-btn {
  background: #7c3aed;
  color: white;
}

footer {
  text-align: center;
  padding: 25px;
  color: #aab3c5;
  font-size: 13px;
}

footer a {
  color: #a78bfa;
  margin: 8px;
  display: inline-block;
  text-decoration: none;
}

#message {
  color: #a78bfa;
  margin-top: 12px;
  font-size: 14px;
}

</style>
</head>

<body>

<header>
  <div class="logo">💎 MEDIA VAULT</div>
  <p>Your All-in-One Media Assistant</p>
</header>

<div class="container">

  <section class="hero">
    <h1>Download <span>Media</span></h1>
    <p>
      Your favorite media tools in one place.
      Fast, simple and smooth experience.
    </p>
  </section>

  <section class="download-box">

    <h3>Paste Media URL</h3><br>

    <input
      type="url"
      id="mediaUrl"
      placeholder="Paste your authorized direct media URL..."
    >

    <button class="download-btn" onclick="downloadMedia()">
      ⬇ Download Media
    </button>

    <p id="message"></p>

  </section>

  <section class="platforms">

    <div class="platform">
      📘 <b>Facebook</b>
    </div>

    <div class="platform">
      🎵 <b>TikTok</b>
    </div>

    <div class="platform">
      𝕏 <b>Twitter / X</b>
    </div>

    <div class="platform">
      🖼️ <b>Photos</b>
    </div>

    <div class="platform">
      📱 <b>Stories</b>
    </div>

    <div class="platform">
      ✍️ <b>Caption Copy</b>
    </div>

  </section>

  <section class="caption">

    <h3>Caption Copy Tool</h3>

    <textarea
      id="captionText"
      placeholder="Paste your caption here..."
    ></textarea>

    <button class="copy-btn" onclick="copyCaption()">
      📋 Copy Caption
    </button>

  </section>

</div>

<footer>

  <p>© 2026 Media Vault. All Rights Reserved.</p>

  <br>

  <a href="terms.html">Terms</a>
  <a href="privacy.html">Privacy</a>
  <a href="dmca.html">DMCA</a>
  <a href="support.html">24/7 Support</a>

</footer>

<script>

function downloadMedia() {

  const url = document.getElementById("mediaUrl").value;
  const message = document.getElementById("message");

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }

    if (!/\.(mp4|webm|jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(parsed.href)) {
      message.textContent =
        "Please provide a direct media file URL.";
      return;
    }

    const link = document.createElement("a");
    link.href = parsed.href;
    link.download = "";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();

    message.textContent =
      "Download requested! Browser permissions may apply.";

  } catch {
    message.textContent =
      "Please enter a valid media URL.";
  }
}

function copyCaption() {

  const caption =
    document.getElementById("captionText").value;

  if (!caption.trim()) {
    alert("Please enter a caption first!");
    return;
  }

  navigator.clipboard.writeText(caption)
    .then(() => alert("Caption copied successfully!"))
    .catch(() => alert("Clipboard permission required."));
}

</script>

</body>
</html>

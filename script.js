
const API_URL = "https://media-vault-api.onrender.com";
async function checkBackend() {
  const message = document.getElementById("message");

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (data.status === "Backend Connected") {
      message.textContent = "Server Connected Successfully!";
      return true;
    }

    message.textContent = "Backend response error";
    return false;

  } catch (error) {
    message.textContent = "Server Connection Failed";
    return false;
  }
}

async function downloadMedia() {
  const url = document.getElementById("mediaUrl").value;
  const message = document.getElementById("message");

  if (!url) {
    message.textContent = "Please enter a media URL";
    return;
  }

  try {
    new URL(url);
  } catch {
    message.textContent = "Invalid URL";
    return;
  }

  message.textContent =
    "Backend connected. Media provider API is not configured yet.";
}

function copyCaption() {
  const caption =
    document.getElementById("captionText").value;

  if (!caption.trim()) {
    alert("Please enter caption");
    return;
  }

  navigator.clipboard.writeText(caption)
    .then(() => alert("Caption copied!"))
    .catch(() => alert("Copy permission required"));
}

checkBackend();

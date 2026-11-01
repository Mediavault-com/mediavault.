
const API_URL = "YOUR_RENDER_URL";

// Test Backend Connection
async function checkBackend() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    console.log("Media Vault:", data.status);
    return data.status === "Backend Connected";

  } catch (error) {
    console.error("Backend connection failed:", error);
    return false;
  }
}

checkBackend();

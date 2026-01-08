const webhookEl = document.getElementById("webhook");
const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save");
const clearBtn = document.getElementById("clear");

function setStatus(msg) {
  statusEl.textContent = msg;
}

function isLikelyDiscordWebhook(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const okHost = u.hostname === "discord.com" || u.hostname === "discordapp.com";
    const okPath = u.pathname.startsWith("/api/webhooks/");
    return u.protocol === "https:" && okHost && okPath;
  } catch {
    return false;
  }
}

async function load() {
  const { webhookUrl } = await chrome.storage.sync.get(["webhookUrl"]);
  webhookEl.value = webhookUrl || "";
  setStatus("");
}

saveBtn.addEventListener("click", async () => {
  const url = (webhookEl.value || "").trim();
  if (!isLikelyDiscordWebhook(url)) {
    setStatus("That doesn’t look like a Discord webhook URL.");
    return;
  }
  await chrome.storage.sync.set({ webhookUrl: url });
  setStatus("Saved.");
});

clearBtn.addEventListener("click", async () => {
  await chrome.storage.sync.remove(["webhookUrl"]);
  webhookEl.value = "";
  setStatus("Cleared.");
});

load();

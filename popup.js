const el = (id) => document.getElementById(id);

const textEl = el("text");
const minEl = el("min");
const secEl = el("sec");
const useTsEl = el("useTs");
const previewEl = el("preview");
const sendBtn = el("send");
const statusEl = el("status");
const openSettings = el("openSettings");

function clampInt(v, min, max) {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function buildDiscordRelativeTimestamp(offsetSeconds) {
  const unix = Math.floor(Date.now() / 1000) + offsetSeconds;
  return `<t:${unix}:R>`; // e.g. "in 5 minutes"
}

function compileMessage() {
  const text = (textEl.value || "").trim();
  const m = clampInt(minEl.value, 0, 999);
  const s = clampInt(secEl.value, 0, 59);

  // normalize inputs back into fields
  minEl.value = String(m);
  secEl.value = String(s);

  const offsetSeconds = m * 60 + s;
  const includeTs = useTsEl.checked && offsetSeconds > 0;

  const ts = includeTs ? buildDiscordRelativeTimestamp(offsetSeconds) : "";
  const compiled = [text, ts].filter(Boolean).join(" ");

  previewEl.textContent = compiled || "—";
  return compiled;
}

async function getWebhookUrl() {
  const { webhookUrl } = await chrome.storage.sync.get(["webhookUrl"]);
  return (webhookUrl || "").trim();
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function sendToDiscord(content) {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) {
    setStatus("No webhook set. Open Settings.");
    return;
  }

  sendBtn.disabled = true;
  setStatus("Sending…");

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Discord error ${res.status}${text ? `: ${text}` : ""}`);
    }

    setStatus("Sent.");
  } catch (err) {
    setStatus(String(err.message || err));
  } finally {
    sendBtn.disabled = false;
  }
}

textEl.addEventListener("input", compileMessage);
minEl.addEventListener("input", compileMessage);
secEl.addEventListener("input", compileMessage);
useTsEl.addEventListener("change", compileMessage);

sendBtn.addEventListener("click", async () => {
  const compiled = compileMessage();
  if (!compiled) {
    setStatus("Nothing to send.");
    return;
  }
  await sendToDiscord(compiled);
});

openSettings.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// initial render
compileMessage();
getWebhookUrl().then((u) => {
  if (!u) setStatus("Set webhook in Settings.");
});

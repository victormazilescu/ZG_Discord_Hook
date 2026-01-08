const el = (id) => document.getElementById(id);

const webhookSelectEl = el("webhookSelect");
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
  return `<t:${unix}:R>`;
}

function compileMessage() {
  const text = (textEl.value || "").trim();
  const m = clampInt(minEl.value, 0, 999);
  const s = clampInt(secEl.value, 0, 59);

  minEl.value = String(m);
  secEl.value = String(s);

  const offsetSeconds = m * 60 + s;
  const includeTs = useTsEl.checked && offsetSeconds > 0;

  const ts = includeTs ? buildDiscordRelativeTimestamp(offsetSeconds) : "";
  const compiled = [text, ts].filter(Boolean).join(" ");

  previewEl.textContent = compiled || "—";
  return compiled;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

async function loadWebhooksAndSelection() {
  const { webhooks = [], selectedWebhookId = "" } =
    await chrome.storage.sync.get(["webhooks", "selectedWebhookId"]);

  webhookSelectEl.innerHTML = "";

  if (webhooks.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No webhooks (open Settings)";
    webhookSelectEl.appendChild(opt);
    webhookSelectEl.disabled = true;
    setStatus("Set a webhook in Settings.");
    return;
  }

  webhookSelectEl.disabled = false;

  for (const wh of webhooks) {
    const opt = document.createElement("option");
    opt.value = wh.id;
    opt.textContent = wh.name || "Unnamed";
    webhookSelectEl.appendChild(opt);
  }

  const exists = webhooks.some((w) => w.id === selectedWebhookId);
  webhookSelectEl.value = exists ? selectedWebhookId : webhooks[0].id;

  await chrome.storage.sync.set({ selectedWebhookId: webhookSelectEl.value });
  setStatus("");
}

async function getSelectedWebhookUrl() {
  const { webhooks = [], selectedWebhookId = "" } =
    await chrome.storage.sync.get(["webhooks", "selectedWebhookId"]);

  const wh = webhooks.find((w) => w.id === selectedWebhookId);
  return (wh?.url || "").trim();
}

async function sendToDiscord(content) {
  const webhookUrl = await getSelectedWebhookUrl();
  if (!webhookUrl) {
    setStatus("No webhook selected. Open Settings.");
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

webhookSelectEl.addEventListener("change", async () => {
  await chrome.storage.sync.set({ selectedWebhookId: webhookSelectEl.value });
});

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

// If options are edited while panel is open, refresh selector automatically.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.webhooks || changes.selectedWebhookId) {
    loadWebhooksAndSelection();
  }
});

// init
compileMessage();
loadWebhooksAndSelection();

const listEl = document.getElementById("list");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
}

function isLikelyDiscordWebhook(url) {
  if (!url) return true; // empty is allowed (means unused slot)
  try {
    const u = new URL(url);
    const okHost = u.hostname === "discord.com" || u.hostname === "discordapp.com";
    const okPath = u.pathname.startsWith("/api/webhooks/");
    return u.protocol === "https:" && okHost && okPath;
  } catch {
    return false;
  }
}

function makeId(i) {
  // stable IDs so "remember last selection" survives edits
  return `wh_${i + 1}`;
}

function renderSlots(existing = []) {
  listEl.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const id = makeId(i);
    const found = existing.find((w) => w.id === id) || { id, name: "", url: "" };

    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="muted" style="margin-bottom:8px;">Webhook ${i + 1}</div>
      <div class="grid">
        <div>
          <label>Name</label>
          <input data-id="${id}" data-field="name" placeholder="e.g. Main, Alerts, Test" value="${escapeHtml(found.name || "")}">
        </div>
        <div>
          <label>Webhook URL</label>
          <input data-id="${id}" data-field="url" placeholder="https://discord.com/api/webhooks/..." value="${escapeHtml(found.url || "")}">
        </div>
      </div>
    `;
    listEl.appendChild(item);
  }
}

// minimal HTML escaping for attribute values
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function collect() {
  const inputs = Array.from(listEl.querySelectorAll("input[data-id][data-field]"));
  const byId = new Map();

  for (const inp of inputs) {
    const id = inp.getAttribute("data-id");
    const field = inp.getAttribute("data-field");
    const value = (inp.value || "").trim();

    if (!byId.has(id)) byId.set(id, { id, name: "", url: "" });
    byId.get(id)[field] = value;
  }

  // Only keep slots with a URL (name optional).
  const webhooks = Array.from(byId.values()).filter((w) => (w.url || "").trim().length > 0);

  return webhooks;
}

async function load() {
  const { webhooks = [] } = await chrome.storage.sync.get(["webhooks"]);
  renderSlots(webhooks);
  setStatus("");
}

saveBtn.addEventListener("click", async () => {
  const webhooks = collect();

  // Validate URLs (only for filled slots)
  for (const w of webhooks) {
    if (!isLikelyDiscordWebhook(w.url)) {
      setStatus("One or more webhook URLs don’t look valid (must be Discord /api/webhooks/).");
      return;
    }
  }

  // Keep selection if possible; otherwise pick first available.
  const { selectedWebhookId = "" } = await chrome.storage.sync.get(["selectedWebhookId"]);
  const ids = webhooks.map((w) => w.id);
  const nextSelected = ids.includes(selectedWebhookId) ? selectedWebhookId : (ids[0] || "");

  await chrome.storage.sync.set({
    webhooks,
    selectedWebhookId: nextSelected
  });

  setStatus("Saved.");
});

load();

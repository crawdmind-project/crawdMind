import { apiRequest, getSession, clearSession } from "./api.js";
const statuses = { UNDER_REVIEW: "Under Review", PLANNED: "Planned", DONE: "Done" };
const list = document.getElementById("moderation-list");
const message = document.getElementById("moderation-message");
const workspace = document.getElementById("moderation-workspace");
const access = document.getElementById("moderation-access");
let ideas = [];
let busy = false;
function notify(text, error = false) {
  message.textContent = text;
  message.classList.toggle("is-error", error);
}
function deny(text) {
  workspace.hidden = true;
  list.replaceChildren();
  access.hidden = false;
  notify(text, true);
}
function failure(error) {
  if (error.status === 401) {
    clearSession();
    deny("Your session has expired. Please sign in again.");
  } else if (error.status === 403) {
    deny("Your account does not have permission to change idea statuses.");
  } else notify(error.message, true);
}
function node(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function render() {
  const query = document.getElementById("moderation-search").value.trim().toLowerCase();
  const status = document.getElementById("moderation-filter").value;
  const filtered = ideas.filter(idea => (!status || idea.status === status) && [idea.title, idea.description, ...(idea.tags || [])].join(" ").toLowerCase().includes(query));
  list.replaceChildren();
  if (!filtered.length) list.append(node("p", "empty-state", "No ideas to show for this filter."));
  for (const idea of filtered) {
    const card = node("article", "idea-card moderation-card");
    const content = node("div", "idea-content");
    content.append(node("h2", "", idea.title));
    const meta = node("div", "idea-meta");
    meta.append(node("span", "", idea.author?.fullName || "Community member"), node("span", "status-badge " + idea.status, statuses[idea.status] || idea.status));
    content.append(meta, node("p", "idea-description", idea.description));
    const controls = node("form", "status-controls");
    const id = "status-" + idea.id;
    const label = node("label", "", "Status for " + idea.title);
    label.htmlFor = id;
    const select = node("select", "");
    select.id = id;
    for (const [value, name] of Object.entries(statuses)) {
      const option = node("option", "", name);
      option.value = value;
      option.selected = idea.status === value;
      select.append(option);
    }
    const save = node("button", "submit", "Save status");
    save.type = "submit";
    select.disabled = busy;
    save.disabled = busy;
    save.setAttribute("aria-label", "Save status for " + idea.title);
    controls.append(label, select, save);
    controls.addEventListener("submit", event => { event.preventDefault(); void update(idea, select.value); });
    card.append(content, controls);
    list.append(card);
  }
}
function setBusy(value) {
  busy = value;
  document.getElementById("moderation-refresh").disabled = value;
  list.setAttribute("aria-busy", String(value));
  render();
}
async function load() {
  if (busy) return;
  workspace.hidden = true;
  access.hidden = true;
  if (!getSession()) { deny("Please sign in to access moderation."); return; }
  setBusy(true);
  notify("Checking your permissions and loading ideas…");
  try {
    // Verify the role with the backend; do not trust a role stored in this browser.
    const profile = (await apiRequest("/api/auth/me", { authenticated: true })).data;
    if (!["MODERATOR", "ADMIN"].includes(profile?.role)) { deny("Moderation is available to Moderator and Admin accounts."); return; }
    const response = await apiRequest("/api/ideas");
    if (!Array.isArray(response.data)) throw new Error("The server returned an unexpected ideas list.");
    ideas = response.data;
    document.getElementById("moderator-name").textContent = "Signed in as " + profile.fullName + " · " + profile.role;
    workspace.hidden = false;
    notify("");
  } catch (error) { failure(error); }
  finally { setBusy(false); }
}
async function update(idea, status) {
  if (busy) return;
  if (status === idea.status) { notify("This idea already has that status."); return; }
  setBusy(true);
  notify("Saving status…");
  try {
    const response = await apiRequest("/api/ideas/" + encodeURIComponent(idea.id) + "/status", { method: "PUT", authenticated: true, body: { status } });
    if (!statuses[response.data?.status]) throw new Error("Status could not be confirmed. Refresh to check the idea.");
    idea.status = response.data.status;
    notify('“' + idea.title + '” is now ' + statuses[idea.status] + ".");
  } catch (error) { failure(error); }
  finally { setBusy(false); }
}
document.getElementById("moderation-refresh").addEventListener("click", load);
document.getElementById("moderation-search").addEventListener("input", render);
document.getElementById("moderation-filter").addEventListener("change", render);
await load();

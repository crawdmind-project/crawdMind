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
  document.getElementById("staff-nav").hidden = true;
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
  document.getElementById("review-count").textContent = ideas.filter(idea => idea.status === "UNDER_REVIEW").length;
  const query = document.getElementById("moderation-search").value.trim().toLowerCase();
  const status = document.getElementById("moderation-filter").value;
  const filtered = ideas.filter(idea => (!status || idea.status === status) && [idea.title, idea.description, ...(idea.tags || [])].join(" ").toLowerCase().includes(query));
  list.replaceChildren();
  if (!filtered.length) list.append(node("p", "empty-state", "No ideas to show for this filter."));
  for (const idea of filtered) {
    const card = node("article", "idea-card queue-card");
    const header = node("div", "queue-card-header");
    const heading = node("div", "queue-card-heading");
    const icon = node("span", "queue-icon");
    icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>';
    icon.setAttribute("aria-hidden", "true");
    const title = node("div", "");
    const date = new Date(idea.createdAt);
    title.append(node("h2", "", idea.status === "UNDER_REVIEW" ? "Idea awaiting review" : "Idea progress"), node("p", "", "Submitted by " + (idea.author?.fullName || "Community member") + (Number.isNaN(date.getTime()) ? "" : " · " + date.toLocaleDateString())));
    heading.append(icon, title);
    header.append(heading, node("span", "status-badge " + idea.status, statuses[idea.status] || idea.status));
    const content = node("div", "queue-card-body");
    content.append(node("h3", "", "Submitted idea"));
    const details = node("div", "queue-idea");
    details.append(node("h4", "", idea.title), node("p", "idea-description", idea.description));
    const tags = node("div", "idea-tags");
    for (const tag of idea.tags || []) tags.append(node("span", "idea-tag", "#" + tag));
    details.append(tags);
    content.append(details);
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
    card.append(header, content, controls);
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
    document.getElementById("profile-name").textContent = profile.fullName;
    document.getElementById("profile-role").textContent = { ADMIN: "Admin", MODERATOR: "Moderator", MEMBER: "Member" }[profile.role] || profile.role;
    document.getElementById("profile-initials").textContent = profile.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join("").toUpperCase();
    document.getElementById("queue-profile").hidden = false;
    document.getElementById("queue-account").hidden = true;
    if (!["MODERATOR", "ADMIN"].includes(profile?.role)) { deny("Moderation is available to Moderator and Admin accounts."); return; }
    const response = await apiRequest("/api/ideas");
    if (!Array.isArray(response.data)) throw new Error("The server returned an unexpected ideas list.");
    ideas = response.data;
    document.getElementById("staff-nav").hidden = false;
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
function switchTab(tab) {
  for (const name of ["reports", "review"]) {
    const button = document.getElementById(name + "-tab");
    button.setAttribute("aria-selected", String(name === tab));
    button.tabIndex = name === tab ? 0 : -1;
    document.getElementById(name + "-panel").hidden = name !== tab;
  }
}
for (const name of ["reports", "review"]) {
  const button = document.getElementById(name + "-tab");
  button.addEventListener("click", () => switchTab(name));
  button.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === "Home" ? "reports" : event.key === "End" ? "review" : name === "reports" ? "review" : "reports";
    switchTab(target);
    document.getElementById(target + "-tab").focus();
  });
}
document.getElementById("go-review").addEventListener("click", () => { switchTab("review"); document.getElementById("review-tab").focus(); });
await load();

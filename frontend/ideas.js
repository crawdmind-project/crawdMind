import { apiRequest, getSession, clearSession } from "./api.js";
const list = document.getElementById("idea-list");
const message = document.getElementById("ideas-message");
const dialog = document.getElementById("idea-dialog");
const form = document.getElementById("idea-form");
const createMessage = document.getElementById("create-message");
const statusNames = { UNDER_REVIEW: "Under Review", PLANNED: "Planned", DONE: "Done" };
let ideas = [];
let loading = false;
let creating = false;
function showMessage(target, text, error = false) {
  target.textContent = text;
  target.classList.toggle("is-error", error);
}
function handleError(error, target = message) {
  if (error.status === 401) {
    clearSession();
    window.location.assign("/login.html?expired=1");
  } else showMessage(target, error.message, true);
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function updateCounts() {
  document.getElementById("stat-total").textContent = ideas.length;
  for (const [id, status] of [["review", "UNDER_REVIEW"], ["planned", "PLANNED"], ["done", "DONE"]]) {
    document.getElementById("stat-" + id).textContent = ideas.filter(idea => idea.status === status).length;
  }
}
function render() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  const status = document.getElementById("status-filter").value;
  const filtered = ideas.filter(idea => (!status || idea.status === status) &&
    [idea.title, idea.description, ...(idea.tags || [])].join(" ").toLowerCase().includes(query));
  filtered.sort(document.getElementById("sort").value === "votes"
    ? (a, b) => (b.counts?.totalScore ?? -Infinity) - (a.counts?.totalScore ?? -Infinity)
    : (a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  list.replaceChildren();
  if (!filtered.length) list.append(element("p", "empty-state", ideas.length ? "No ideas match your filters." : "No ideas yet. Be the first to share one!"));
  for (const idea of filtered) {
    const card = element("article", "idea-card");
    const controls = element("div", "vote-controls");
    for (const type of ["UPVOTE", "DOWNVOTE"]) {
      const button = element("button", "", type === "UPVOTE" ? "↑" : "↓");
      button.type = "button";
      button.setAttribute("aria-label", (type === "UPVOTE" ? "Upvote " : "Downvote ") + idea.title);
      // The API has no current-user vote endpoint. Only mark a vote confirmed in this page session.
      if (idea.currentVote !== undefined) button.setAttribute("aria-pressed", String(idea.currentVote === type));
      button.disabled = loading || Boolean(idea.voting);
      button.addEventListener("click", () => vote(idea, type));
      controls.append(button);
      if (type === "UPVOTE") controls.append(element("span", "vote-score", idea.counts?.totalScore ?? "—"));
    }
    const content = element("div", "idea-content");
    content.append(element("h2", "", idea.title));
    const meta = element("div", "idea-meta");
    const date = new Date(idea.createdAt);
    meta.append(element("span", "", idea.author?.fullName || "Community member"), element("span", "", Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString()), element("span", "status-badge " + idea.status, statusNames[idea.status] || idea.status));
    content.append(meta, element("p", "idea-description", idea.description));
    const tags = element("div", "idea-tags");
    for (const tag of idea.tags || []) tags.append(element("span", "idea-tag", "#" + tag));
    content.append(tags, element("p", "vote-detail", idea.counts ? `${idea.counts.upvotes} upvotes · ${idea.counts.downvotes} downvotes` : "Vote totals unavailable. Refresh to try again."));
    card.append(controls, content);
    list.append(card);
  }
}
async function loadIdeas() {
  if (loading || ideas.some(idea => idea.voting)) return;
  loading = true;
  document.getElementById("refresh").disabled = true;
  document.getElementById("new-idea").disabled = true;
  list.setAttribute("aria-busy", "true");
  showMessage(message, "Loading ideas… The server may take a moment to start.");
  try {
    const result = await apiRequest("/api/ideas");
    if (!Array.isArray(result.data)) throw new Error("The server returned an unexpected ideas list.");
    const previous = new Map(ideas.map(idea => [idea.id, idea.currentVote]));
    ideas = result.data.map(idea => ({ ...idea, currentVote: previous.get(idea.id) }));
    updateCounts();
    render();
    // A failed vote-count request must not hide the ideas that loaded successfully.
    const results = await Promise.allSettled(ideas.map(async idea => {
      idea.counts = (await apiRequest("/api/votes/" + encodeURIComponent(idea.id))).data;
    }));
    render();
    showMessage(message, results.some(result => result.status === "rejected") ? "Ideas loaded, but some vote totals could not load. Try Refresh ideas." : "", results.some(result => result.status === "rejected"));
  } catch (error) { handleError(error); }
  finally {
    loading = false;
    document.getElementById("refresh").disabled = false;
    document.getElementById("new-idea").disabled = false;
    render();
    list.setAttribute("aria-busy", "false");
  }
}
async function vote(idea, type) {
  if (!getSession()) { window.location.assign("/login.html"); return; }
  if (idea.voting) return;
  idea.voting = true;
  render();
  let saved = false;
  try {
    const result = await apiRequest("/api/votes/" + encodeURIComponent(idea.id), { method: "POST", authenticated: true, body: { voteType: type } });
    saved = true;
    idea.currentVote = result.vote?.voteType || null;
    showMessage(message, result.message || "Vote saved.");
    idea.counts = (await apiRequest("/api/votes/" + encodeURIComponent(idea.id))).data;
  } catch (error) {
    if (saved) { idea.counts = null; showMessage(message, "Your vote was saved, but totals could not refresh. Click Refresh ideas.", true); }
    else handleError(error);
  } finally { idea.voting = false; render(); }
}
document.getElementById("new-idea").addEventListener("click", () => {
  if (!getSession()) { window.location.assign("/login.html"); return; }
  showMessage(createMessage, "");
  dialog.showModal();
});
for (const id of ["close-idea", "cancel-idea"]) document.getElementById(id).addEventListener("click", () => { if (!creating) dialog.close(); });
dialog.addEventListener("cancel", event => { if (creating) event.preventDefault(); });
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (creating) return;
  const title = form.elements.title.value.trim();
  const description = form.elements.description.value.trim();
  if (!title || !description) { showMessage(createMessage, "Please enter a title and description.", true); return; }
  const tags = [...new Set(form.elements.tags.value.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean))];
  creating = true;
  form.setAttribute("aria-busy", "true");
  for (const id of ["submit-idea", "close-idea", "cancel-idea"]) document.getElementById(id).disabled = true;
  showMessage(createMessage, "Submitting your idea…");
  try {
    await apiRequest("/api/ideas", { method: "POST", authenticated: true, body: { title, description, tags } });
    form.reset();
    dialog.close();
    document.getElementById("search").value = "";
    document.getElementById("status-filter").value = "";
    await loadIdeas();
  } catch (error) { handleError(error, createMessage); }
  finally {
    creating = false;
    form.removeAttribute("aria-busy");
    for (const id of ["submit-idea", "close-idea", "cancel-idea"]) document.getElementById(id).disabled = false;
  }
});
document.getElementById("search").addEventListener("input", render);
for (const id of ["status-filter", "sort"]) document.getElementById(id).addEventListener("change", render);
document.getElementById("refresh").addEventListener("click", loadIdeas);
await loadIdeas();

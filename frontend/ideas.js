import { checkDuplicates } from "./community-ui.js";
import "./app-header.js";
import { apiRequest, getSession, clearSession } from "./api.js";
import { openComments } from "./comments.js";
import { attachIdeaActions } from "./idea-actions.js";
const list = document.getElementById("idea-list");
const message = document.getElementById("ideas-message");
const dialog = document.getElementById("idea-dialog");
const form = document.getElementById("idea-form");
const createMessage = document.getElementById("create-message");
const statusNames = { UNDER_REVIEW: "Under Review", PLANNED: "Planned", DONE: "Done" };
let ideas = [];
let loading = false;
let creating = false;
let reloadRequested = false;
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
  const counts = new Map();
  for (const idea of ideas) for (const tag of new Set(idea.tags || [])) counts.set(tag, (counts.get(tag) || 0) + 1);
  const popular = document.getElementById("popular-tags");
  popular.replaceChildren();
  for (const [tag] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    const button = element("button", "idea-tag", "#" + tag); button.type = "button";
    button.addEventListener("click", () => { document.getElementById("tag-filter").value = tag; render(); }); popular.append(button);
  }
  if (!counts.size) popular.append(element("p", "", "No tags yet."));
  document.getElementById("stat-total").textContent = ideas.length;
  for (const [id, status] of [["review", "UNDER_REVIEW"], ["planned", "PLANNED"], ["done", "DONE"]]) {
    document.getElementById("stat-" + id).textContent = ideas.filter(idea => idea.status === status).length;
  }
}
function render() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  const status = document.getElementById("status-filter").value;
  const tagQuery = document.getElementById("tag-filter").value.trim().replace(/^#/, "").toLowerCase();
  const filtered = ideas.filter(idea => (!tagQuery || (idea.tags || []).some(tag => tag.toLowerCase().includes(tagQuery))) && (!status || idea.status === status) &&
    [idea.title, idea.description, ...(idea.tags || [])].join(" ").toLowerCase().includes(query));
  const sort = document.getElementById("sort").value;
  filtered.sort((a, b) => {
    const metric = idea => sort === "votes" ? idea.counts?.totalScore : idea.commentCount;
    if (sort !== "date") {
      const left = metric(a), right = metric(b);
      if (left === undefined && right !== undefined) return 1;
      if (right === undefined && left !== undefined) return -1;
      if (left !== right && left !== undefined && right !== undefined) return right - left;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  list.replaceChildren();
  if (!filtered.length) list.append(element("p", "empty-state", ideas.length ? "No ideas match your filters." : "No ideas yet. Be the first to share one!"));
  for (const idea of filtered) {
    const card = element("article", "idea-card");
    card.id = "idea-" + idea.id;
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
    const comments = element("button", "comments-link", idea.commentCount === undefined ? "Comments →" : `${idea.commentCount} ${idea.commentCount === 1 ? "comment" : "comments"}`);
    comments.type = "button";
    comments.setAttribute("aria-label", "Comments on " + idea.title);
    comments.addEventListener("click", () => openComments(idea));
    content.append(comments);
    card.append(controls, content);
    list.append(card);
    if (!loading && !idea.voting) void attachIdeaActions(idea, content);
  }
}
async function loadIdeas() {
  if (loading || ideas.some(idea => idea.voting)) { reloadRequested = true; return; }
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
    const results = await Promise.allSettled(ideas.flatMap(idea => [
      apiRequest("/api/votes/" + encodeURIComponent(idea.id)).then(response => { idea.counts = response.data; }),
      ...(getSession() ? [apiRequest("/api/votes/" + encodeURIComponent(idea.id) + "/me", { authenticated: true }).then(response => { idea.currentVote = response.data; })] : []),
      Promise.resolve().then(() => { idea.commentCount = idea._count?.comments; })
    ]));
    render();
    showMessage(message, results.some(result => result.status === "rejected") ? "Ideas loaded, but some vote or comment totals could not load. Try Refresh ideas." : "", results.some(result => result.status === "rejected"));
  } catch (error) { handleError(error); }
  finally {
    loading = false;
    document.getElementById("refresh").disabled = false;
    document.getElementById("new-idea").disabled = false;
    render();
    list.setAttribute("aria-busy", "false");
    if (reloadRequested) { reloadRequested = false; void loadIdeas(); }
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
  } finally { idea.voting = false; render(); if (reloadRequested) { reloadRequested = false; void loadIdeas(); } }
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
  for (const field of form.elements) field.disabled = true;
  form.setAttribute("aria-busy", "true");
  for (const id of ["submit-idea", "close-idea", "cancel-idea"]) document.getElementById(id).disabled = true;
  showMessage(createMessage, "Submitting your idea…");
  try {
    if (!await checkDuplicates(form, title, description)) { showMessage(createMessage, "Review the similar ideas below, or submit again to create yours."); return; }
    await apiRequest("/api/ideas", { method: "POST", authenticated: true, body: { title, description, tags } });
    form.reset(); delete form.dataset.duplicateConfirmed; form.querySelector(".duplicate-results")?.replaceChildren();
    dialog.close();
    document.getElementById("search").value = "";
    document.getElementById("status-filter").value = "";
    document.getElementById("tag-filter").value = "";
    await loadIdeas();
  } catch (error) { handleError(error, createMessage); }
  finally {
    creating = false;
    for (const field of form.elements) field.disabled = false;
    form.removeAttribute("aria-busy");
    for (const id of ["submit-idea", "close-idea", "cancel-idea"]) document.getElementById(id).disabled = false;
  }
});
document.getElementById("search").addEventListener("input", render);
document.getElementById("tag-filter").addEventListener("input", render);
for (const id of ["status-filter", "sort"]) document.getElementById(id).addEventListener("change", render);
document.getElementById("refresh").addEventListener("click", loadIdeas);
document.addEventListener("ideas-changed", () => void loadIdeas());
document.addEventListener("comments-changed", () => void loadIdeas());
document.getElementById("search").value = new URLSearchParams(location.search).get("search") || "";
await loadIdeas();
let linkedIdea = new URLSearchParams(location.search).get("idea");
if (linkedIdea && !ideas.some(idea => idea.id === linkedIdea)) {
  try { const response = await apiRequest("/api/ideas/" + encodeURIComponent(linkedIdea)); linkedIdea = response.data.id; if (response.mergedFrom) showMessage(message, "This idea was merged. Showing the surviving idea."); } catch (error) { handleError(error); }
}
if (linkedIdea) {
  const card = document.getElementById("idea-" + linkedIdea);
  if (card) {
    card.classList.add("idea-highlight");
    card.tabIndex = -1;
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "center" });
  }
}
if (new URLSearchParams(location.search).has("new")) document.getElementById("new-idea").click();

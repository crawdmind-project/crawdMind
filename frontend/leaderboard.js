import { apiRequest } from "./api.js";
import { openComments } from "./comments.js";
const list = document.getElementById("leaderboard-list");
const message = document.getElementById("leaderboard-message");
const refresh = document.getElementById("leaderboard-refresh");
const statuses = { UNDER_REVIEW: "Under Review", PLANNED: "Planned", DONE: "Done" };
let loading = false;
let reloadRequested = false;
function node(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function render(ideas) {
  list.replaceChildren();
  if (!ideas.length) { list.append(node("li", "empty-state", "No ideas yet. Share your first idea on the Ideas page.")); return; }
  let rank = 0;
  let previousVotes;
  ideas.forEach((idea, index) => {
    const votes = idea._count?.votes;
    const comments = idea._count?.comments;
    if (index === 0 || votes !== previousVotes) rank = index + 1;
    previousVotes = votes;
    const card = node("li", "leaderboard-card");
    const badge = node("span", "leaderboard-rank rank-" + rank, rank);
    badge.setAttribute("aria-label", "Rank " + rank);
    const content = node("div", "leaderboard-content");
    content.append(node("h2", "", idea.title));
    const meta = node("div", "idea-meta");
    meta.append(node("span", "", idea.author?.fullName || "Community member"), node("span", "status-badge " + idea.status, statuses[idea.status] || idea.status));
    content.append(meta, node("p", "idea-description", idea.description));
    const tags = node("div", "idea-tags");
    for (const tag of idea.tags || []) tags.append(node("span", "idea-tag", "#" + tag));
    content.append(tags);
    const metrics = node("div", "leaderboard-metrics");
    for (const [count, label] of [[votes, votes === 1 ? "total vote" : "total votes"], [comments, comments === 1 ? "comment" : "comments"]]) {
      const metric = node("span", "");
      metric.append(node("strong", "", Number.isInteger(count) ? count : "—"), document.createTextNode(label));
      metrics.append(metric);
    }
    const actions = node("div", "leaderboard-actions");
    const view = node("a", "", "View idea →");
    view.href = "/ideas.html?idea=" + encodeURIComponent(idea.id);
    view.setAttribute("aria-label", "View idea: " + idea.title);
    const discussion = node("button", "comments-link", "Comments");
    discussion.type = "button";
    discussion.setAttribute("aria-label", "Comments on " + idea.title);
    discussion.addEventListener("click", () => openComments(idea));
    actions.append(view, discussion);
    content.append(metrics, actions);
    card.append(badge, content);
    list.append(card);
  });
}
async function load() {
  if (loading) { reloadRequested = true; return; }
  loading = true;
  refresh.disabled = true;
  list.setAttribute("aria-busy", "true");
  message.classList.remove("is-error");
  message.textContent = "Loading the leaderboard… The server may take a moment to start.";
  try {
    const result = await apiRequest("/api/ideas/leaderboard");
    if (!Array.isArray(result.data)) throw new Error("The server returned an unexpected leaderboard.");
    // Preserve the backend's order; total votes include both vote directions.
    render(result.data.slice(0, 10));
    message.textContent = "";
  } catch (error) {
    message.classList.add("is-error");
    message.textContent = error.message + " Click Refresh leaderboard to try again.";
  } finally {
    loading = false;
    refresh.disabled = false;
    list.setAttribute("aria-busy", "false");
    if (reloadRequested) { reloadRequested = false; void load(); }
  }
}
refresh.addEventListener("click", load);
document.addEventListener("comments-changed", () => void load());
await load();

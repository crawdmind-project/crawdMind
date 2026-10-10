import { apiRequest, getSession, clearSession } from "./api.js";
import { profileReady } from "./app-header.js";
let verifiedProfile;
profileReady.then(profile => { verifiedProfile = profile; if (dialog.open) render(); });

const dialog = document.createElement("dialog");
dialog.id = "comments-dialog";
dialog.setAttribute("aria-labelledby", "comments-title");
// This markup is fixed. API content is inserted only with textContent.
dialog.innerHTML = `<div class="dialog-heading"><h2 id="comments-title">Comments</h2><button id="close-comments" type="button" aria-label="Close comments">×</button></div>
<p id="comments-idea-title" class="comments-idea-title"></p>
<div class="comments-toolbar"><span id="comments-count"></span><button id="reload-comments" class="secondary" type="button">Refresh comments</button></div>
<p id="comments-message" class="form-message" role="status" aria-live="polite"></p>
<section id="comments-list" aria-label="Comments"></section>
<form id="comment-form"><div class="field"><label for="comment-content">Your comment</label><textarea id="comment-content" name="content" required rows="3" placeholder="Add to the conversation…"></textarea></div><button id="post-comment" type="submit" class="submit">Post comment</button></form>
<p id="comment-sign-in" hidden><a href="/login.html">Sign in</a> to join the conversation.</p>`;
document.body.append(dialog);
const find = id => dialog.querySelector("#" + id);
const form = find("comment-form");
const list = find("comments-list");
const message = find("comments-message");
let idea;
let comments = [];
let busy = false;
let reading = false;
let revision = 0;
function notify(text, error = false) {
  message.textContent = text;
  message.classList.toggle("is-error", error);
}
function failure(error) {
  if (error.status === 401) {
    clearSession();
    window.location.assign("/login.html?expired=1");
  } else notify(error.message, true);
}
function node(tag, className, text) {
  const result = document.createElement(tag);
  result.className = className;
  result.textContent = text;
  return result;
}
function setBusy(value) {
  busy = value;
  form.elements.content.disabled = value;
  for (const id of ["close-comments", "reload-comments", "post-comment"]) find(id).disabled = value || (id !== "close-comments" && reading);
  form.setAttribute("aria-busy", String(value));
  render();
}
function render() {
  list.replaceChildren();
  find("comments-count").textContent = `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`;
  if (!comments.length) list.append(node("p", "comments-empty", "No comments yet. Start the conversation."));
  const userId = getSession()?.user.id;
  for (const comment of comments) {
    const article = document.createElement("article");
    article.className = "comment-card";
    const header = document.createElement("div");
    header.className = "comment-heading";
    const date = new Date(comment.createdAt);
    header.append(node("strong", "", comment.user?.fullName || "Community member"), node("span", "", Number.isNaN(date.getTime()) ? "" : date.toLocaleString()));
    article.append(header, node("p", "comment-body", comment.content));
    if ((userId && comment.userId === userId) || ["ADMIN", "MODERATOR"].includes(verifiedProfile?.role)) {
      const button = node("button", "comment-delete", comment.userId === userId ? "Delete my comment" : "Delete comment");
      button.type = "button";
      button.disabled = busy || reading;
      button.addEventListener("click", () => removeComment(comment));
      article.append(button);
    }
    list.append(article);
  }
}
async function load() {
  const currentRevision = ++revision;
  const id = idea.id;
  reading = true;
  find("post-comment").disabled = true;
  if (comments.length) render();
  find("reload-comments").disabled = true;
  list.setAttribute("aria-busy", "true");
  notify("Loading comments…");
  try {
    const response = await apiRequest("/api/comments/idea/" + encodeURIComponent(id));
    if (currentRevision !== revision) return;
    if (!Array.isArray(response.data)) throw new Error("The server returned an unexpected comments list.");
    comments = response.data;
    render();
    notify("");
  } catch (error) { if (currentRevision === revision) failure(error); }
  finally {
    if (currentRevision === revision) {
      reading = false;
      find("reload-comments").disabled = busy;
      find("post-comment").disabled = busy;
      if (comments.length) render();
      list.setAttribute("aria-busy", "false");
    }
  }
}
export function openComments(selectedIdea) {
  if (busy) return;
  idea = selectedIdea;
  comments = [];
  form.reset();
  find("comments-idea-title").textContent = idea.title;
  form.hidden = !getSession();
  find("comment-sign-in").hidden = Boolean(getSession());
  list.replaceChildren();
  find("comments-count").textContent = "";
  dialog.showModal();
  void load();
}
find("close-comments").addEventListener("click", () => { if (!busy) dialog.close(); });
dialog.addEventListener("cancel", event => { if (busy) event.preventDefault(); });
dialog.addEventListener("close", () => { revision++; });
find("reload-comments").addEventListener("click", () => { if (!busy) void load(); });
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy || reading) return;
  const content = form.elements.content.value.trim();
  if (!content) { notify("Please write a comment before posting.", true); form.elements.content.focus(); return; }
  // Invalidate an in-flight read so it cannot overwrite a newly created comment.
  revision++;
  setBusy(true);
  notify("Posting your comment…");
  try {
    const response = await apiRequest("/api/comments", { method: "POST", authenticated: true, body: { content, ideaId: idea.id } });
    comments.unshift(response.data);
    form.reset();
    notify("Your comment was posted.");
    document.dispatchEvent(new CustomEvent("comments-changed"));
  } catch (error) { failure(error); }
  finally { setBusy(false); list.setAttribute("aria-busy", "false"); }
});
async function removeComment(comment) {
  if (busy || reading) return;
  revision++;
  setBusy(true);
  notify("Deleting your comment…");
  try {
    await apiRequest("/api/comments/" + encodeURIComponent(comment.id), { method: "DELETE", authenticated: true });
    comments = comments.filter(item => item.id !== comment.id);
    notify("Your comment was deleted.");
    document.dispatchEvent(new CustomEvent("comments-changed"));
  } catch (error) { failure(error); }
  finally { setBusy(false); list.setAttribute("aria-busy", "false"); }
}

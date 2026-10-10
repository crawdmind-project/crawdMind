import { apiRequest, clearSession } from "./api.js";
import { profileReady } from "./app-header.js";
const dialog = document.createElement("dialog");
dialog.id = "edit-idea-dialog";
dialog.setAttribute("aria-labelledby", "edit-heading");
dialog.innerHTML = `<div class="dialog-heading"><h2 id="edit-heading">Edit idea</h2><button id="edit-close" type="button" aria-label="Close idea action">×</button></div><form id="edit-form"><div id="edit-fields"><div class="field"><label for="edit-title">Idea title *</label><input id="edit-title" name="title" required></div><div class="field"><label for="edit-description">Description *</label><textarea id="edit-description" name="description" required rows="5"></textarea></div><div class="field"><label for="edit-tags">Tags</label><input id="edit-tags" name="tags"><p class="input-hint">Separate tags with commas.</p></div></div><p id="delete-warning" hidden></p><p id="edit-message" class="form-message" role="status" aria-live="polite"></p><div class="dialog-actions"><button id="edit-cancel" class="secondary" type="button">Cancel</button><button id="edit-save" class="submit" type="submit">Save changes</button></div></form>`;
document.body.append(dialog);
const find = id => dialog.querySelector("#" + id);
const form = find("edit-form");
let selected, mode, busy = false;
function open(idea, action) {
  selected = idea; mode = action;
  const deleting = action === "delete";
  find("edit-heading").textContent = deleting ? "Delete idea?" : "Edit your idea";
  find("edit-fields").hidden = deleting;
  find("delete-warning").hidden = !deleting;
  find("delete-warning").textContent = 'Delete “' + idea.title + '”? This also deletes its votes and comments and cannot be undone. Cancel to keep it.';
  for (const field of ["title", "description", "tags"]) { form.elements[field].value = field === "tags" ? (idea.tags || []).join(", ") : idea[field]; form.elements[field].required = !deleting && field !== "tags"; }
  find("edit-save").textContent = deleting ? "Delete idea" : "Save changes";
  find("edit-save").classList.toggle("danger", deleting);
  find("edit-message").textContent = "";
  dialog.showModal();
}
export async function attachIdeaActions(idea, container) {
  const profile = await profileReady;
  if (!profile || !container.isConnected) return;
  const owner = idea.userId === profile.id;
  if (!owner && !["ADMIN", "MODERATOR"].includes(profile.role)) return;
  const menu = document.createElement("details"); menu.className = "idea-menu";
  const summary = document.createElement("summary"); summary.textContent = "⋯"; summary.setAttribute("aria-label", "Actions for " + idea.title);
  menu.append(summary);
  for (const action of owner ? ["edit", "delete"] : ["delete"]) {
    const button = document.createElement("button"); button.type = "button"; button.textContent = action === "edit" ? "Edit idea" : "Delete idea";
    button.addEventListener("click", () => { menu.open = false; open(idea, action); }); menu.append(button);
  }
  container.append(menu);
}
for (const id of ["edit-close", "edit-cancel"]) find(id).addEventListener("click", () => { if (!busy) dialog.close(); });
dialog.addEventListener("cancel", event => { if (busy) event.preventDefault(); });
form.addEventListener("submit", async event => {
  event.preventDefault(); if (busy) return;
  const title = form.elements.title.value.trim(), description = form.elements.description.value.trim();
  const message = find("edit-message"); message.classList.remove("is-error");
  if (mode === "edit" && (!title || !description)) { message.textContent = "Please enter a title and description."; message.classList.add("is-error"); return; }
  busy = true; for (const el of form.elements) el.disabled = true; find("edit-close").disabled = true;
  message.textContent = mode === "delete" ? "Deleting idea…" : "Saving changes…";
  try {
    const body = { title, description, tags: [...new Set(form.elements.tags.value.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean))] };
    await apiRequest("/api/ideas/" + encodeURIComponent(selected.id), { method: mode === "delete" ? "DELETE" : "PUT", authenticated: true, ...(mode === "edit" ? { body } : {}) });
    dialog.close(); document.dispatchEvent(new CustomEvent("ideas-changed"));
  } catch (error) {
    message.textContent = error.message; message.classList.add("is-error");
    if (error.status === 401) { clearSession(); location.assign("/login.html?expired=1"); }
  } finally { busy = false; for (const el of form.elements) el.disabled = false; find("edit-close").disabled = false; }
});

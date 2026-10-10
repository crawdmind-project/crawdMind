import { checkDuplicates } from "./community-ui.js";
import { apiRequest, getSession, clearSession } from "./api.js";
const dialog = document.createElement("dialog"); dialog.id = "shared-idea-dialog";
dialog.setAttribute("aria-labelledby", "shared-idea-title");
dialog.innerHTML = `<div class="dialog-heading"><h2 id="shared-idea-title">Share Your Idea</h2><button id="shared-close" type="button" aria-label="Close new idea">×</button></div><form id="shared-idea-form"><div class="field"><label for="shared-title">Idea Title *</label><input id="shared-title" name="title" required placeholder="Enter a clear, descriptive title for your idea…"></div><div class="field"><label for="shared-description">Description *</label><textarea id="shared-description" name="description" required rows="5" placeholder="Describe your idea, benefits and potential implementation…"></textarea></div><div class="field"><label for="shared-tags">Tags</label><input id="shared-tags" name="tags" placeholder="Add relevant tags, separated by commas…"></div><p id="shared-message" class="form-message" role="status" aria-live="polite"></p><div class="dialog-actions"><button id="shared-cancel" type="button" class="secondary">Cancel</button><button type="submit" class="submit">Submit Idea</button></div></form>`;
document.body.append(dialog);
const form = dialog.querySelector("form"); let busy = false;
export function openNewIdea() {
  if (!getSession()) { location.assign("/login.html"); return; }
  if (busy) return;
  form.reset(); delete form.dataset.duplicateConfirmed; form.querySelector(".duplicate-results")?.replaceChildren(); document.getElementById("shared-message").textContent = ""; dialog.showModal();
}
for (const id of ["shared-close", "shared-cancel"]) document.getElementById(id).addEventListener("click", () => { if (!busy) dialog.close(); });
dialog.addEventListener("cancel", event => { if (busy) event.preventDefault(); });
form.addEventListener("submit", async event => {
  event.preventDefault(); if (busy) return;
  const title = form.elements.title.value.trim(), description = form.elements.description.value.trim();
  const message = document.getElementById("shared-message"); message.classList.remove("is-error");
  if (!title || !description) { message.textContent = "Enter a title and description."; message.classList.add("is-error"); return; }
  const body = { title, description, tags: [...new Set(form.elements.tags.value.split(",").map(tag => tag.trim().replace(/^#/, "")).filter(Boolean))] };
  busy = true; for (const el of form.elements) el.disabled = true; document.getElementById("shared-close").disabled = true;
  message.textContent = "Submitting your idea…";
  try {
    if (!await checkDuplicates(form, title, description)) { message.textContent = "Review the similar ideas below, or submit again to create yours."; return; }
    await apiRequest("/api/ideas", { method: "POST", body, authenticated: true });
    dialog.close(); document.dispatchEvent(new CustomEvent("ideas-changed"));
  } catch (error) {
    message.textContent = error.message; message.classList.add("is-error");
    if (error.status === 401) { clearSession(); location.assign("/login.html?expired=1"); }
  } finally { busy = false; for (const el of form.elements) el.disabled = false; document.getElementById("shared-close").disabled = false; }
});

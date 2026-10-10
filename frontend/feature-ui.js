import { apiRequest, clearSession } from "./api.js";
export function el(tag, text, className = "") { const node = document.createElement(tag); node.textContent = text; node.className = className; return node; }
export function errorMessage(error, output) {
  output.textContent = error.status === 404 ? "This feature needs the updated CrowdMind backend. Start the local API or deploy the new backend." : error.message;
  output.classList.add("is-error");
  if (error.status === 401) { clearSession(); location.assign("/login.html?expired=1"); }
}
export function pending(form, value) { for (const field of form.elements) field.disabled = value; }
export function confirmation(title, copy, action) {
  const dialog = document.createElement("dialog"); dialog.setAttribute("aria-label", title);
  const heading = el("h2", title), description = el("p", copy), message = el("p", "", "form-message");
  const form = document.createElement("form"), cancel = el("button", "Cancel", "secondary"), save = el("button", "Confirm", "submit danger");
  cancel.type = "button"; save.type = "submit";
  cancel.onclick = () => dialog.close();
  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("cancel", event => { if (save.disabled) event.preventDefault(); });
  form.append(cancel, save); dialog.append(heading, description, message, form); document.body.append(dialog); dialog.showModal();
  form.onsubmit = async event => { event.preventDefault(); pending(form, true); try { await action(); dialog.close(); } catch (error) { errorMessage(error, message); } finally { pending(form, false); } };
}

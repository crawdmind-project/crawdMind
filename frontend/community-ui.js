import { apiRequest } from "./api.js";
import { el, errorMessage, pending } from "./feature-ui.js";
export function openReport(idea) {
  const dialog = document.createElement("dialog"); dialog.setAttribute("aria-label", "Report idea");
  dialog.innerHTML = '<div class="dialog-heading"><h2>Report idea</h2><button type="button" aria-label="Close report">×</button></div><p class="report-title"></p><form><div class="field"><label>Reason<select name="reason"><option>Spam</option><option>Abuse</option><option>Duplicate</option><option>Other</option></select></label></div><div class="field"><label>Description<textarea name="description" required maxlength="2000" rows="4"></textarea></label></div><p class="form-message" role="status"></p><button class="submit">Send report</button></form>';
  dialog.querySelector(".report-title").textContent = idea.title;
  const form = dialog.querySelector("form"), message = dialog.querySelector(".form-message"), close = dialog.querySelector("button");
  close.onclick = () => { if (!close.disabled) dialog.close(); };
  dialog.addEventListener("cancel", event => { if (close.disabled) event.preventDefault(); });
  dialog.addEventListener("close", () => dialog.remove()); document.body.append(dialog); dialog.showModal();
  form.onsubmit = async event => {
    event.preventDefault(); const body = { ideaId: idea.id, reason: form.elements.reason.value, description: form.elements.description.value.trim() };
    if (!body.description) { message.textContent = "Describe the problem."; return; }
    pending(form, true); close.disabled = true;
    try { await apiRequest("/api/reports", { method: "POST", authenticated: true, body }); message.textContent = "Report sent. A moderator will review it."; form.hidden = true; dialog.append(el("p", message.textContent)); }
    catch (error) { errorMessage(error, message); }
    finally { pending(form, false); close.disabled = false; }
  };
}
export async function checkDuplicates(form, title, description) {
  const signature = title + "\n" + description;
  if (form.dataset.duplicateConfirmed === signature) return true;
  let box = form.querySelector(".duplicate-results");
  if (!box) { box = el("section", "", "duplicate-results"); box.setAttribute("aria-live", "polite"); form.append(box); }
  const result = await apiRequest("/api/ideas/duplicates?title=" + encodeURIComponent(title) + "&description=" + encodeURIComponent(description));
  box.replaceChildren();
  if (!result.data.length) return true;
  box.append(el("h3", "Similar ideas already exist"), el("p", "Open an existing idea to vote or discuss. Submit again if your idea is different."));
  for (const idea of result.data) { const link = el("a", idea.title); link.href = "/ideas.html?idea=" + encodeURIComponent(idea.id); box.append(link); }
  form.dataset.duplicateConfirmed = signature;
  return false;
}
export async function openNotifications(onRefresh) {
  const dialog = document.createElement("dialog"); dialog.setAttribute("aria-label", "Notifications");
  const title = el("h2", "Notifications"), close = el("button", "Close", "secondary"), readAll = el("button", "Mark all as read", "secondary"), list = el("section", ""), message = el("p", "", "form-message");
  close.onclick = () => dialog.close(); dialog.addEventListener("close", () => dialog.remove());
  dialog.append(title, close, readAll, message, list); document.body.append(dialog); dialog.showModal();
  async function load() {
    readAll.disabled = true;
    try {
      const result = await apiRequest("/api/notifications", { authenticated: true }); list.replaceChildren(); message.textContent = "";
      if (!result.data.length) list.append(el("p", "No notifications yet."));
      for (const item of result.data) {
        const card = el("article", "", "notification-card"); card.append(el("p", item.message), el("small", new Date(item.createdAt).toLocaleString()));
        if (item.ideaId) { const link = el("a", "View idea"); link.href = "/ideas.html?idea=" + encodeURIComponent(item.ideaId); card.append(link); }
        if (!item.readAt) { const read = el("button", "Mark as read", "secondary"); read.onclick = async () => { read.disabled = true; try { await apiRequest("/api/notifications/" + item.id + "/read", { method: "PUT", authenticated: true }); await load(); await onRefresh(); } catch (error) { errorMessage(error, message); read.disabled = false; } }; card.append(read); }
        list.append(card);
      }
    } catch (error) { errorMessage(error, message); } finally { readAll.disabled = false; }
  }
  readAll.onclick = async () => { readAll.disabled = true; try { await apiRequest("/api/notifications/read-all", { method: "PUT", authenticated: true }); await load(); await onRefresh(); } catch (error) { errorMessage(error, message); readAll.disabled = false; } };
  await load();
}

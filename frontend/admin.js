import { profileReady } from "./app-header.js";
import { apiRequest } from "./api.js";
import { el, errorMessage, pending, confirmation } from "./feature-ui.js";
const list = document.getElementById("users-list"), message = document.getElementById("users-message");
const profile = await profileReady;
async function load() {
  list.replaceChildren();
  if (!["ADMIN", "MODERATOR"].includes(profile?.role)) { message.textContent = "Only Moderators and Admins can view community users."; return; }
  try {
    const result = await apiRequest("/api/auth/admin/users", { authenticated: true }); message.textContent = "";
    for (const user of result.data) {
      const card = el("article", "", "user-card"); card.append(el("h2", user.fullName), el("p", user.email + " · " + user.role));
      if (profile.role === "ADMIN") {
        const form = document.createElement("form");
        for (const [name, title, type] of [["fullName", "Full name", "text"], ["email", "Email", "email"]]) { const label = el("label", title), input = document.createElement("input"); input.name = name; input.type = type; input.required = true; input.value = user[name]; label.append(input); form.append(label); }
        const label = el("label", "Role"), select = document.createElement("select"); select.name = "role";
        for (const role of ["MEMBER", "MODERATOR", "ADMIN"]) { const option = el("option", role); option.value = role; option.selected = role === user.role; select.append(option); } label.append(select); form.append(label);
        const save = el("button", "Save user", "submit"), remove = el("button", "Delete user", "secondary danger"); remove.type = "button"; form.append(save, remove);
        form.onsubmit = event => {
          event.preventDefault(); const body = { fullName: form.elements.fullName.value.trim(), email: form.elements.email.value.trim(), role: form.elements.role.value };
          confirmation("Update user?", "Save profile and role changes for " + user.fullName + "?", async () => { pending(form, true); try { await apiRequest("/api/auth/admin/users/" + user.id, { method: "PUT", authenticated: true, body }); if (user.id === profile.id) location.reload(); else await load(); } finally { pending(form, false); } });
        };
        remove.onclick = () => confirmation("Delete user?", "Delete " + user.fullName + " and their ideas, votes and comments? This cannot be undone.", async () => { await apiRequest("/api/auth/admin/users/" + user.id, { method: "DELETE", authenticated: true }); if (user.id === profile.id) location.assign("/login.html"); else await load(); });
        card.append(form);
      } list.append(card);
    }
  } catch (error) { errorMessage(error, message); }
}
document.getElementById("users-refresh").onclick = load; await load();

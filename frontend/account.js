import { apiRequest, getSession, saveSession, clearSession } from "./api.js";
import { confirmation, pending, errorMessage } from "./feature-ui.js";
const message = document.getElementById("account-message"), form = document.getElementById("profile-form"), session = getSession();
if (!session) location.replace("/login.html");
else {
  try {
    const result = await apiRequest("/api/auth/me", { authenticated: true });
    document.getElementById("page-title").textContent = "Welcome, " + result.data.fullName;
    document.getElementById("account-subtitle").textContent = "Manage your CrowdMind account.";
    for (const field of ["fullName", "email"]) form.elements[field].value = result.data[field];
    document.getElementById("account-role").textContent = result.data.role;
    form.hidden = false; document.getElementById("delete-account").hidden = false;
    if (["ADMIN", "MODERATOR"].includes(result.data.role)) document.getElementById("manage-users").hidden = false;
  } catch (error) { errorMessage(error, message); }
}
form.onsubmit = async event => {
  event.preventDefault(); const body = { fullName: form.elements.fullName.value.trim(), email: form.elements.email.value.trim() };
  const changedPassword = Boolean(form.elements.password.value);
  if (changedPassword) {
    if (form.elements.password.value !== form.elements.confirm.value) { message.textContent = "Passwords must match."; return; }
    body.password = form.elements.password.value;
  }
  pending(form, true);
  try {
    const result = await apiRequest("/api/auth/me", { method: "PUT", authenticated: true, body });
    if (changedPassword) { clearSession(); location.assign("/login.html"); return; }
    const remembered = Boolean(localStorage.getItem("crowdmind.session")); saveSession(session.token, result.data, remembered);
    document.getElementById("page-title").textContent = "Welcome, " + result.data.fullName; message.textContent = "Profile saved."; message.classList.remove("is-error");
  } catch (error) { errorMessage(error, message); }
  finally { pending(form, false); }
};
document.getElementById("delete-account").onclick = () => confirmation("Delete your account?", "This permanently deletes your account, ideas, votes and comments. You cannot undo it.", async () => { await apiRequest("/api/auth/me", { method: "DELETE", authenticated: true }); clearSession(); location.replace("/register.html"); });
document.getElementById("logout").onclick = async event => {
  event.currentTarget.disabled = true;
  try { await apiRequest("/api/auth/logout", { method: "POST", authenticated: true }); } catch {}
  finally { clearSession(); location.replace("/login.html"); }
};

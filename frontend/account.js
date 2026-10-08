import { apiRequest, getSession, clearSession } from "./api.js";
const message = document.getElementById("account-message");
if (!getSession()) {
  window.location.replace("/login.html");
} else {
  try {
    const result = await apiRequest("/api/auth/me", { authenticated: true });
    document.getElementById("page-title").textContent = "Welcome, " + result.data.fullName;
    document.getElementById("account-subtitle").textContent = "You are signed in to CrowdMind.";
    for (const [field, value] of Object.entries({ name: result.data.fullName, email: result.data.email, role: result.data.role })) {
      document.getElementById("profile-" + field).textContent = value;
    }
    document.getElementById("profile").hidden = false;
  } catch (failure) {
    if (failure.status === 401) {
      clearSession();
      window.location.replace("/login.html?expired=1");
    } else {
      message.classList.add("is-error");
      message.textContent = failure.message;
    }
  }
}
document.getElementById("logout").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "Signing out…";
  try {
    await apiRequest("/api/auth/logout", { method: "POST", authenticated: Boolean(getSession()) });
  } catch {
    // Clear this browser's session even when the API cannot be reached.
  } finally {
    clearSession();
    window.location.replace("/login.html");
  }
});

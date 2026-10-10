import { apiRequest, getSession, clearSession } from "./api.js";
const page = location.pathname.split("/").pop();
const header = document.querySelector("header");
header.className = "queue-header";
header.innerHTML = `<a class="wordmark" href="/index.html"><span class="mini-logo">CM</span>CrowdMind</a><nav aria-label="Main navigation"><a href="/ideas.html">Ideas</a><a href="/leaderboard.html">Leaderboard</a><a href="/admin.html" id="users-nav" hidden>Users</a><a href="/moderation.html" data-staff-link id="staff-nav" hidden>Moderation</a></nav><label class="queue-search"><input id="header-search" type="search" aria-label="Search community ideas" placeholder="Search ideas…"></label>${page === "ideas.html" ? '<button class="submit new-idea" id="new-idea" type="button">+ New Idea</button>' : '<a class="queue-new" href="/ideas.html?new=1">+ New Idea</a>'}<button class="notification-button" id="notification-button" hidden type="button">Notifications <span id="notification-count"></span></button><a class="queue-profile" id="queue-profile" href="/account.html" hidden><span class="profile-avatar" id="profile-initials"></span><span><strong id="profile-name"></strong><span class="profile-role" id="profile-role"></span></span></a><a href="/login.html" id="queue-account">Sign in</a><button class="header-logout" id="header-logout" type="button" hidden aria-label="Sign out">↪</button>`;
for (const link of header.querySelectorAll("nav a")) if (link.pathname === location.pathname) link.setAttribute("aria-current", "page");
export const profileReady = getSession() ? apiRequest("/api/auth/me", { authenticated: true }).then(({ data }) => {
  document.getElementById("profile-name").textContent = data.fullName;
  document.getElementById("profile-role").textContent = { MEMBER: "Member", MODERATOR: "Moderator", ADMIN: "Admin" }[data.role] || data.role;
  document.getElementById("profile-initials").textContent = data.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  document.getElementById("queue-profile").hidden = false;
  document.getElementById("queue-account").hidden = true;
  document.getElementById("header-logout").hidden = false;
  document.getElementById("staff-nav").hidden = !["ADMIN", "MODERATOR"].includes(data.role);
  document.getElementById("users-nav").hidden = !["ADMIN", "MODERATOR"].includes(data.role);
  document.getElementById("notification-button").hidden = false;
  void refreshNotifications();
  return data;
}).catch(error => { if (error.status === 401) clearSession(); return null; }) : Promise.resolve(null);
document.getElementById("header-logout").addEventListener("click", async event => {
  event.currentTarget.disabled = true;
  try { await apiRequest("/api/auth/logout", { method: "POST", authenticated: true }); }
  catch { /* Sign out of this browser even when the server is unreachable. */ }
  finally { clearSession(); location.assign("/login.html"); }
});
document.getElementById("header-search").addEventListener("input", event => {
  const target = document.getElementById(page === "moderation.html" ? "moderation-search" : "search");
  if (target) { target.value = event.target.value; target.dispatchEvent(new Event("input")); }
});
document.getElementById("header-search").addEventListener("keydown", event => {
  if (event.key === "Enter" && page === "leaderboard.html") location.assign("/ideas.html?search=" + encodeURIComponent(event.target.value));
});
if (page !== "ideas.html") {
  const link = header.querySelector(".queue-new");
  link.addEventListener("click", async event => { event.preventDefault(); const { openNewIdea } = await import("./new-idea.js"); openNewIdea(); });
}

async function refreshNotifications() { try { const result = await apiRequest("/api/notifications", { authenticated: true }); document.getElementById("notification-count").textContent = result.unread ? "(" + result.unread + ")" : ""; } catch { document.getElementById("notification-count").textContent = ""; } }
document.getElementById("notification-button").onclick = async () => { const { openNotifications } = await import("./community-ui.js"); await openNotifications(refreshNotifications); };

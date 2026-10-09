import { apiRequest, getSession } from "./api.js";
const link = document.querySelector("[data-staff-link]");
if (link && getSession()) {
  try {
    const { data } = await apiRequest("/api/auth/me", { authenticated: true });
    link.hidden = !["ADMIN", "MODERATOR"].includes(data?.role);
  } catch {
    link.hidden = true;
  }
}

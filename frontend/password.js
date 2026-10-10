import { apiRequest, clearSession } from "./api.js";
import { pending, errorMessage } from "./feature-ui.js";
const form = document.getElementById("password-form"), message = form.querySelector(".form-message"), mode = form.dataset.mode;
const token = new URLSearchParams(location.search).get("token");
if (mode === "reset") history.replaceState(null, "", location.pathname);
form.onsubmit = async event => {
  event.preventDefault(); message.classList.remove("is-error");
  if (mode === "reset" && form.elements.password.value !== form.elements.confirm.value) { message.textContent = "Passwords must match."; return; }
  const body = mode === "forgot" ? { email: form.elements.email.value.trim() } : { token, password: form.elements.password.value };
  pending(form, true);
  try { const result = await apiRequest("/api/auth/" + (mode === "forgot" ? "forgot-password" : "reset-password"), { method: "POST", body }); message.textContent = result.message; if (mode === "reset") { clearSession(); form.reset(); form.querySelector("button").hidden = true; } }
  catch (error) { errorMessage(error, message); }
  finally { pending(form, false); }
};

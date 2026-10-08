import { apiRequest, saveSession } from "./api.js";
const form = document.querySelector("#auth-form");
const mode = form.dataset.mode;
let submitting = false;
const status = document.getElementById("form-message");
function error(id, message) {
  const input = document.getElementById(id);
  document.getElementById(id + "-error").textContent = message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
}
function validate(input) {
  const value = input.value.trim();
  let message = "";
  if (input.id === "name" && !value) message = "Please enter your full name.";
  if (input.id === "email" && (!value || input.validity.typeMismatch)) message = "Please enter a valid email address.";
  if (input.id === "password" && !input.value) message = "Please enter your password.";
  else if (input.id === "password" && mode === "register" && input.value.length < 8) message = "Use at least 8 characters.";
  if (input.id === "confirm-password" && (!input.value || input.value !== form.elements.password.value)) message = "Your passwords must match.";
  if (input.id === "terms" && !input.checked) message = "Please check the agreement box to continue.";
  error(input.id, message);
  return !message;
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (submitting) return;
  status.textContent = "";
  status.classList.remove("is-error");
  const inputs = [...form.querySelectorAll("input[required], #terms")];
  const results = inputs.map(validate);
  if (results.some(result => !result)) {
    inputs[results.indexOf(false)].focus();
    return;
  }
  const body = { email: form.elements.email.value.trim(), password: form.elements.password.value };
  if (mode === "register") body.fullName = form.elements.name.value.trim();
  const remember = mode === "login" && form.elements.remember.checked;
  const submit = form.querySelector('[type="submit"]');
  const label = submit.innerHTML;
  submitting = true;
  submit.disabled = true;
  submit.textContent = mode === "register" ? "Creating account…" : "Signing in…";
  form.setAttribute("aria-busy", "true");
  status.textContent = "Connecting… The server may take a moment to start.";
  try {
    const result = await apiRequest("/api/auth/" + mode, { method: "POST", body });
    saveSession(result.token, result.data, remember);
    form.elements.password.value = "";
    if (mode === "register") form.elements["confirm-password"].value = "";
    window.location.assign("/account.html");
  } catch (failure) {
    status.classList.add("is-error");
    status.textContent = failure.message;
    if (failure.status === 409) error("email", "An account already exists with this email. Please sign in.");
    if (failure.status === 401) error("password", "Check your email and password.");
    status.focus();
  } finally {
    submitting = false;
    submit.disabled = false;
    submit.innerHTML = label;
    form.removeAttribute("aria-busy");
  }
});
form.querySelectorAll("input[required], #terms").forEach(input => {
  input.addEventListener("blur", () => {
    if (input.value || input.getAttribute("aria-invalid") === "true") validate(input);
  });
  input.addEventListener("input", () => {
    if (!submitting) status.textContent = "";
    if (input.getAttribute("aria-invalid") === "true") validate(input);
    if (input.id === "password" && mode === "register") {
      const confirm = document.getElementById("confirm-password");
      if (confirm.value) validate(confirm);
    }
  });
  input.addEventListener("change", () => {
    if (input.id === "terms" && input.getAttribute("aria-invalid") === "true") validate(input);
  });
});
document.querySelectorAll(".reveal").forEach(button => {
  button.addEventListener("click", () => {
    const input = document.getElementById(button.getAttribute("aria-controls"));
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", (show ? "Hide " : "Show ") + (input.id === "confirm-password" ? "confirm password" : "password"));
  });
});
const info = {
  recovery: ["Password recovery", "Password recovery is not available yet."],
  terms: ["Terms of Service", "Final Terms of Service have not been provided for this learning project. This checkbox is a form control and does not record a legal agreement."],
  privacy: ["Privacy Policy", "Your name, email, and password are sent to the CrowdMind API to create an account or sign in. Passwords are not stored in this browser. The final Privacy Policy has not yet been provided."]
};
const dialog = document.getElementById("info-dialog");
document.querySelectorAll("[data-dialog]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    const [title, copy] = info[button.dataset.dialog];
    document.getElementById("dialog-title").textContent = title;
    document.getElementById("dialog-copy").textContent = copy;
    dialog.showModal();
  });
});
document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
document.getElementById("dialog-done").addEventListener("click", () => dialog.close());
if (new URLSearchParams(location.search).has("expired")) {
  status.classList.add("is-error");
  status.textContent = "Your session has expired. Please sign in again.";
}

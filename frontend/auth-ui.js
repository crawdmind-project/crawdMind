const form = document.querySelector("#auth-form");
const mode = form.dataset.mode;
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
form.addEventListener("submit", event => {
  event.preventDefault();
  document.getElementById("form-message").textContent = "";
  const inputs = [...form.querySelectorAll("input[required], #terms")];
  const results = inputs.map(validate);
  if (results.some(result => !result)) {
    inputs[results.indexOf(false)].focus();
    return;
  }
  // UI only. No fetch, localStorage, account creation, or token handling.
  const status = document.getElementById("form-message");
  status.textContent = mode === "register"
    ? "Your form looks good. This is a preview; no account has been created."
    : "Your form looks good. This is a preview; you have not been signed in.";
  status.focus();
});
form.querySelectorAll("input[required], #terms").forEach(input => {
  input.addEventListener("blur", () => {
    if (input.value || input.getAttribute("aria-invalid") === "true") validate(input);
  });
  input.addEventListener("input", () => {
    document.getElementById("form-message").textContent = "";
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
  recovery: ["Password recovery", "Password recovery is not available in this UI preview. You can return to sign in or create an account."],
  terms: ["Terms of Service", "The final Terms of Service will be provided before registration opens. This preview does not create an account or record an agreement."],
  privacy: ["Privacy Policy", "This UI preview does not send or save your form details. The final Privacy Policy will be provided before registration opens."]
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

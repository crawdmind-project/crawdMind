import { apiRequest } from "./api.js";
import { el, errorMessage, confirmation } from "./feature-ui.js";
let reportLoading = false;
export async function loadReports() {
  if (reportLoading) return; reportLoading = true;
  const list = document.getElementById("reports-list"), message = document.getElementById("reports-message"); message.textContent = "Loading reports…";
  try {
    const status = document.getElementById("report-filter").value;
    const result = await apiRequest("/api/reports?status=" + status, { authenticated: true });
    list.replaceChildren(); message.textContent = result.data.length ? "" : "No reports in this queue.";
    if (status === "PENDING") document.getElementById("reports-count").textContent = result.data.length;
    for (const report of result.data) {
      const card = el("article", "", "idea-card queue-card report-card"), header = el("div", "", "queue-card-header"), heading = el("div", "");
      heading.append(el("h2", "⚑ Report: " + report.reason), el("p", "Reported by " + report.user.fullName + " · " + new Date(report.createdAt).toLocaleDateString()));
      header.append(heading, el("span", report.status, "status-badge")); const body = el("div", "", "queue-card-body");
      body.append(el("h3", "Report Description:"), el("p", report.description), el("h3", "Reported Idea:"));
      const idea = el("div", "", "queue-idea"); idea.append(el("h4", report.idea.title), el("p", "by " + report.idea.author.fullName), el("p", report.idea.description));
      const tags = el("div", "", "idea-tags"); for (const tag of report.idea.tags) tags.append(el("span", "#" + tag, "idea-tag")); idea.append(tags); body.append(idea); card.append(header, body);
      if (report.status === "PENDING") {
        const controls = el("div", "", "report-controls"), label = el("label", "Resolution note"), input = document.createElement("textarea"); input.maxLength = 1000; input.rows = 2; label.className = "report-resolution"; label.append(input); controls.append(label);
        for (const [action, caption] of [["HIDE", "Take Action"], ["DISMISS", "Dismiss Report"]]) {
          const button = el("button", caption, action === "HIDE" ? "submit danger" : "secondary");
          button.onclick = () => {
            if (!input.value.trim()) { message.textContent = "Write a resolution note before resolving a report."; input.focus(); return; }
            confirmation(action === "HIDE" ? "Hide reported idea?" : "Dismiss report?", action === "HIDE" ? "Hide this idea from the community and close its pending reports? Its data is retained." : "Close this report without hiding the idea?", async () => { await apiRequest("/api/reports/" + report.id + "/resolve", { method: "PUT", authenticated: true, body: { action, resolution: input.value.trim() } }); await loadReports(); document.dispatchEvent(new CustomEvent("ideas-changed")); });
          }; controls.append(button);
        } card.append(controls);
      } else body.append(el("p", "Resolution: " + report.resolution));
      list.append(card);
    }
  } catch (error) { errorMessage(error, message); } finally { reportLoading = false; }
}
export function mergeControls(idea, ideas, refresh) {
  const box = el("details", "", "merge-controls"); box.append(el("summary", "Merge duplicate idea"));
  box.append(el("p", "The selected idea survives with its title, description and status. Comments and tags transfer; if a user voted on both ideas, their vote on the surviving idea is kept. This cannot be undone."));
  const label = el("label", "Keep this idea"), select = document.createElement("select"); select.setAttribute("aria-label", "Merge target for " + idea.title);
  for (const target of ideas.filter(x => x.id !== idea.id)) { const option = el("option", target.title); option.value = target.id; select.append(option); }
  label.append(select); box.append(label); const button = el("button", "Merge ideas", "secondary"); button.disabled = !select.options.length;
  button.onclick = () => confirmation("Merge duplicate ideas?", 'Merge “' + idea.title + '” into “' + select.selectedOptions[0].textContent + '”? This cannot be undone.', async () => { await apiRequest("/api/ideas/" + idea.id + "/merge", { method: "POST", authenticated: true, body: { targetId: select.value } }); await refresh(); });
  box.append(button); return box;
}

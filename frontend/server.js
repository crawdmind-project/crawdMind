import http from "node:http";
import { readFile } from "node:fs/promises";
const port = Number(process.env.FRONTEND_PORT || 5173);
const allowed = new Set(["login.html", "register.html", "account.html", "styles.css", "auth-ui.js", "api.js", "account.js", "ideas.html", "ideas.js", "ideas.css", "comments.js", "moderation.html", "moderation.js", "moderation.css", "staff-nav.js"]);
const types = { html: "text/html; charset=utf-8", css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8" };
http.createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/config.js") {
    res.writeHead(200, { "Content-Type": types.js, "Cache-Control": "no-store" });
    res.end("window.CROWDMIND_API_BASE_URL = " + JSON.stringify(process.env.API_BASE_URL || "https://crawdmind.onrender.com") + ";");
    return;
  }
  if (pathname === "/" || pathname === "/login" || pathname === "/register") {
    res.writeHead(302, { Location: pathname === "/register" ? "/register.html" : "/login.html" });
    res.end();
    return;
  }
  const name = pathname.slice(1);
  if (!allowed.has(name)) { res.writeHead(404); res.end("Not found"); return; }
  try {
    const content = await readFile(new URL(name, import.meta.url));
    res.writeHead(200, { "Content-Type": types[name.split(".").pop()], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.writeHead(500);
    res.end("Unable to read page");
  }
}).listen(port, "127.0.0.1", () => console.log("CrowdMind frontend: http://localhost:" + port));

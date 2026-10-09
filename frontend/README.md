# CrowdMind frontend

This frontend connects to the existing teammate backend documented in
../api-doc.md. No backend files are changed.

## Run

```bash
cd frontend
npm start
```

Open http://localhost:5173/login.html or /register.html.
Node's built-in modules provide the local server; no npm install is required.
Keep the terminal running. After editing server.js, restart the frontend server.

## API connection

The default API base URL is https://crawdmind.onrender.com.
For another backend, set API_BASE_URL before starting the frontend, for example:

```powershell
$env:API_BASE_URL = "http://localhost:5000"
npm start
```

The local server exposes this public base URL through /config.js. Do not put
secrets or database connection strings in this configuration.
A static host can provide the equivalent config.js or use api.js's default.

| Page/action | Backend request |
| --- | --- |
| Register | POST /api/auth/register with fullName, email, password |
| Login | POST /api/auth/login with email, password |
| Account | GET /api/auth/me with Authorization: Bearer <token> |
| Sign out | POST /api/auth/logout; clears this browser's saved session |

Registration/login consume the backend response { success, token, data }.
After success, the Ideas page opens. My account loads the verified profile.
The confirmation password and agreement checkbox are frontend-only fields.

Sessions use sessionStorage by default, or localStorage when Remember me is
checked. Passwords are not saved. The backend verifies permissions and token
expiry; a 401 on the account page clears the local session and returns to login.
Logout clears the browser's session even if the network request fails.
The existing backend logout endpoint does not revoke already issued JWTs.

## Files

- login.html and register.html: forms and CrowdMind design.
- auth-ui.js: validation, API submissions, loading/error states, password toggles.
- api.js: shared requests and session storage.
- account.html and account.js: verified profile and sign out.
- styles.css: shared responsive styling.
- server.js: local preview server and public API configuration.

## Checks

```bash
npm test
```

Client tests cover the documented registration payload, session storage,
Bearer authorization, API errors, and network failures.
Manual verification: register a disposable account, view its profile, sign
out, sign in again, and verify wrong-password/duplicate-email errors.

The Render backend may take a moment to start. Requests have a 65-second
timeout and duplicate submissions are disabled while a request is pending.
Password recovery and final legal policy documents are not provided by the
existing API and remain informational dialogs.

## Ideas page

Open /ideas.html. Public visitors can browse ideas; creating an idea and voting
require a signed-in account. Successful login/registration opens this page.

- ideas.html: navigation, statistics, filters, cards, New Idea dialog.
- ideas.css: responsive layout matching the CrowdMind design.
- ideas.js: loads ideas, creates ideas, toggles votes and refreshes totals.

| Action | Request |
| --- | --- |
| List ideas | GET /api/ideas |
| Create idea | POST /api/ideas with title, description, tags (array) |
| Vote/change/remove | POST /api/votes/:ideaId with voteType UPVOTE or DOWNVOTE |
| Read score | GET /api/votes/:ideaId; data.upvotes, downvotes, totalScore |

The existing API removes a vote when the same direction is submitted twice.
The frontend disables each idea's vote buttons while a request is pending.
The API does not return the current user's vote when loading ideas, so arrows
are highlighted only after a confirmed vote during this page visit. Totals
always come from the backend. Failed counts do not hide the idea list.
Search, status filtering and score/date sorting happen in the browser.
New ideas use the backend default status (currently PLANNED).
Comments, editing, leaderboard and moderation pages are future frontend work.

Manual check: sign in, create an idea with comma-separated tags, upvote it,
change to downvote, click downvote again to remove, then refresh. Check search,
status filters and mobile layout. An expired session returns to sign-in.

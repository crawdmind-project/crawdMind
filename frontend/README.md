# CrowdMind frontend

This frontend connects to the existing teammate backend documented in
../api-doc.md. No backend files are changed.

## Run

```bash
cd frontend
npm start
```

Open http://localhost:5173/ for Home, or /login.html and /register.html.
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
Owners can edit their ideas. The Leaderboard page displays the API rankings.

Manual check: sign in, create an idea with comma-separated tags, upvote it,
change to downvote, click downvote again to remove, then refresh. Check search,
status filters and mobile layout. An expired session returns to sign-in.

## Comments

Each idea has a Comments button that opens its discussion. Anyone can read
comments; signed-in members can post and delete their own comments. The UI
shows the author's name and creation time. Ownership comes from userId and the
current session's user id; the backend makes the final permission decision.

comments.js provides the dialog and calls these existing teammate endpoints:

- GET /api/comments/idea/:ideaId: loads comments (data array, newest first).
- POST /api/comments: sends content and ideaId with the session Bearer token.
- DELETE /api/comments/:id: deletes the signed-in member's own comment.

Whitespace-only submissions are rejected in the browser. API text is displayed
using textContent. Pending submissions disable repeat actions; failed posting
keeps the draft. Refresh comments reloads the discussion, and failed reads
show a retryable error. Closing/reopening ignores outdated read responses.
Comment owners and server-verified Moderators/Admins can delete comments.
The backend authorizes every deletion.

Manual check: open a discussion while signed out (read-only), sign in, post a
comment, refresh to verify persistence, then delete it. A different member's
comment must have no Delete my comment control.

## Moderation and status workflow

Open /moderation.html using the navigation on Ideas. The page verifies the
current role with GET /api/auth/me. Only MODERATOR and ADMIN can see its
workspace. Members and signed-out visitors see an access explanation.
No accounts are promoted and no backend permissions are changed.

- moderation.html: page, workflow guide, search and status filters.
- moderation.js: verified-role gate, idea loading and status updates.
- PUT /api/ideas/:id/status sends { status } with Bearer authentication.
- Supported values: UNDER_REVIEW, PLANNED, DONE.

The guide shows Under Review → Planned → Done. Staff can choose any supported
status because the existing backend does not enforce a transition order.
New ideas still receive the backend default PLANNED; frontend does not override
that default. Saved values come from the API response. Failed updates retain
the last confirmed status, show an error and allow retry. A 403 removes the
workspace; a 401 clears the session. The backend authorizes every write.

This page manages idea statuses. Reports require backend endpoints.
Owner/staff idea deletion is available on Ideas; duplicate merging requires
backend support.

Verification uses an isolated local API fixture for staff/member roles,
successful status transitions, refreshed persistence and failed update handling.
A deployed Moderator/Admin login was not available, so staff writes have not
been tested against the deployed backend. To verify there: sign in with a staff
account, change a test idea from Under Review to Planned to Done, refresh, and
confirm the matching badge on Ideas. A Member must not see status controls.

## Reference-aligned Moderation Queue

The moderation screen uses a queue header, verified user identity, Reports and
Under Review tabs, nested idea cards, tags and status actions. Under Review
opens by default and its count comes from the full real idea list. Updating an
idea away from UNDER_REVIEW removes it from that filter; All statuses shows it
again. Tabs support arrow keys, Home and End.

Reports shows an honest unavailable state. The API has no reporting endpoints,
so there are no fabricated reports, report totals, Take Action or Dismiss
Report requests. Reports backend support must be supplied before those actions
can be connected. Leaderboard and an in-place New Idea form are available. Notifications
require backend endpoints.

app-header.js keeps the shared Moderation link hidden until the backend
confirms ADMIN or MODERATOR. It does not trust a locally saved role. Failed
verification, signed-out visitors and Members keep the link hidden. Direct
access to /moderation.html is still protected by its existing role check.

Checks now include three staff navigation tests, bringing the client suite to
eight tests. The revised queue layout, tabs and status-count updates were also
verified with the isolated local fixture, not a deployed staff account.

## Leaderboard

Open /leaderboard.html from Ideas or Moderation. GET /api/ideas/leaderboard
provides at most 10 ideas, already ordered by total vote count. The frontend
preserves that order and displays author, status, tags, _count.votes and
_count.comments. Votes include UPVOTE and DOWNVOTE; this is not net score.
Equal totals share a competition rank (1, 1, 3). The API does not define the
ordering of ties or guarantee which tied ideas appear at the tenth position.

leaderboard.html, leaderboard.css and leaderboard.js provide the page. Public
visitors can read it. Comments uses the shared discussion dialog; successful
posting/deletion refreshes leaderboard counts from the API. View idea opens
and highlights that idea on Ideas, where signed-in users can vote. Refresh
leaderboard reloads rankings. Empty and retryable error states are provided.
The staff-only navigation uses the same verified-role checks as Ideas.

## Completed reference pages

The / route now opens index.html, the landing page matching the supplied visual
reference. home.css and home.js provide its layout, demo walkthrough, policy
notices and statistics computed from real ideas. No fabricated active-user or
satisfaction figures are shown. Auth page wordmarks return to Home.

app-header.js creates the shared Ideas/Leaderboard/Moderation header. Identity
and staff navigation are based on /api/auth/me. Sign out clears the session.
new-idea.js opens the creation form in place on Leaderboard and Moderation.
idea-actions.js provides owner edits (PUT /api/ideas/:id) and owner/staff
confirmed deletion (DELETE /api/ideas/:id). Requests use the existing Bearer
token; backend permissions remain authoritative. API content uses textContent.
Ideas now reads each idea's comments for accurate counts/comment sorting and
provides popular tag buttons and a separate tag filter. Successful mutations
refresh the list; failed edits retain the draft.

See PROGRESS.md for the complete page checklist, remaining API gaps and a
simple teacher-demo sequence. Reports,
notifications, password recovery and duplicate merge still require backend
work and are not represented as completed features.

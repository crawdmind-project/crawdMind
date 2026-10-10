# CrowdMind progress and remaining work

This change completes the frontend supported by the teammate's current API.
No backend files, real account roles or deployment settings were changed.

| Page / feature | Status |
| --- | --- |
| Home / landing | Built with working register/login links, demo walkthrough and real idea statistics |
| Register / Login | Connected to the existing API; validation and password visibility |
| Ideas | Real list, status statistics, search, tag filter, popular tags, date/score/comment sorting |
| New Idea | Title, description and tags; available from Ideas, Leaderboard and Moderation |
| Idea actions | Owners edit; owners/staff delete with an explicit confirmation dialog |
| Voting | Upvote/downvote/change/remove through the existing API |
| Comments | Read, post, owner/staff deletion, verified counts and refresh |
| Leaderboard | Real top 10 ordered by total vote count, including both directions |
| Moderation | Verified Moderator/Admin role; Under Review/Planned/Done status updates |
| Header | Shared navigation, real name/role, staff-only Moderation link and sign out |
| Account | Verified name/email/role and sign out |
| Responsive layout | Desktop and narrow layouts; semantic forms and keyboard-accessible dialogs/tabs |

## Requires backend or project input

- Reports: create/list reports and take-action/dismiss endpoints. Reports tab currently explains availability honestly.
- Duplicate detection and merge: server-side detection/merge endpoint and rules for combining votes, comments and ownership. This teacher MVP item is still unfinished.
- Notifications: list/read endpoints or a documented source. No fake notification badge is shown.
- Forgot password: reset request and token-based reset endpoints plus email delivery. Current button explains availability.
- Final Terms and Privacy Policy: project-approved documents, not sample text presented as a final policy.
- Deployed Moderator/Admin verification: use an existing staff test account. No real account was promoted by this frontend work.

The existing API defaults new ideas to PLANNED and permits any supported status
transition. The teacher's intended initial UNDER_REVIEW state needs a backend
change. It also has no read endpoint for the current user's vote selection;
counts are authoritative but arrow highlighting is known only after a vote in
the current page visit. Logout clears the browser session; existing API tokens
are not revoked by the backend logout endpoint.

## Quick demo

1. Open http://localhost:5173/ and explore the landing page.
2. Register or log in. Check your real name and role in the header.
3. Create an idea, add tags, search/filter it and edit it from its ⋯ menu.
4. Upvote, switch to downvote, click again to remove. Add a comment.
5. Open Leaderboard and View idea. Try sorting Ideas by comments.
6. With a staff account, open Moderation and save a status change.
7. Delete only a disposable idea. Cancel first to check the confirmation.
8. Sign out and verify staff controls are hidden.

# CrowdMind API

Local API: http://localhost:5001. Hosted API: https://crawdmind.onrender.com (new features require deployment/migrations).
Protected requests use Authorization: Bearer <jwt>. JSON bodies use Content-Type: application/json.
Responses: { success, data?, message?, token? }. Errors: { success: false, message }.

## Accounts

- POST /api/auth/register — fullName, email, password; Public; always creates MEMBER.
- POST /api/auth/login — email, password; Public.
- POST /api/auth/logout — Public; with Bearer token invalidates all user's sessions.
- GET /api/auth/me — Authenticated; verified safe profile.
- PUT /api/auth/me — fullName?, email?, password?; Authenticated. Role/other fields rejected.
- DELETE /api/auth/me — Authenticated.
- GET /api/auth/admin/users — MODERATOR / ADMIN.
- PUT /api/auth/admin/users/:id — fullName?, email?, password?, role?; ADMIN.
- DELETE /api/auth/admin/users/:id — ADMIN.
- POST /api/auth/forgot-password — email; Public, rate limited.
- POST /api/auth/reset-password — token, password; Public, rate limited.
- GET /api/protected — Authenticated.

Names: 1–100 characters. Emails trimmed/lowercased. Passwords: >=8 characters and <=72 UTF-8 bytes. Never return hashes or tokenVersion.
Password changes/reset revoke existing sessions. Last Admin deletion/demotion returns 409.
Recovery gives the same response for known/unknown valid emails. Tokens are stored hashed, expire after 30 minutes and are single-use. Production needs SMTP; local mail files stay outside Git. Tokens are not returned through the API.

## Ideas

- GET /api/ideas — Public; active ideas, author and _count.comments.
- GET /api/ideas/leaderboard — Public; top 10 by total votes including both directions.
- GET /api/ideas/duplicates — title, description?, excludeId? query; Public; top 5 suggestions >=0.5 similarity.
- GET /api/ideas/:id — Public; resolves merge aliases; mergedFrom identifies original ID.
- POST /api/ideas — title, description, tags?; Authenticated; defaults UNDER_REVIEW.
- PUT /api/ideas/:id — title, description, tags?; Owner.
- PUT /api/ideas/:id/status — status; MODERATOR / ADMIN.
- POST /api/ideas/:id/merge — targetId; MODERATOR / ADMIN.
- DELETE /api/ideas/:id — Owner / MODERATOR / ADMIN.

Workflow: UNDER_REVIEW → PLANNED → DONE. Same-state writes allowed; skipped/backwards transitions return 409.
Title: 1–200, description: 1–5000, at most 15 nonempty tags <=50 characters.
Similarity: title word Jaccard overlap, or 70% title +30% description overlap, whichever is larger. Suggestions do not automatically block distinct ideas.
Merge is transactional: target title/description/status/author remain, tags combine, comments transfer. If a user voted on both, keep their target vote. Duplicate reporter collisions keep the target report. Source becomes an alias, previous aliases flatten, notification links transfer, both authors are notified. Hidden/merged ideas reject active writes. Deleting target deletes aliases.

## Votes/comments

- GET /api/votes/:ideaId — Public; data={ideaId,upvotes,downvotes,totalScore}.
- GET /api/votes/:ideaId/me — Authenticated; data=UPVOTE,DOWNVOTE or null.
- POST /api/votes/:ideaId — voteType: UPVOTE or DOWNVOTE; Authenticated; returns vote or null.
- GET /api/comments/idea/:ideaId — Public.
- POST /api/comments — content, ideaId; Authenticated.
- DELETE /api/comments/:id — Owner / MODERATOR / ADMIN.

Same direction removes vote; opposite changes it. Unique user/idea constraint and serializable retry preserve one vote. Comments: 1–2000 characters; another member's comment notifies idea author.

## Reports

- POST /api/reports — ideaId, reason, description; Authenticated.
- GET /api/reports — status query PENDING(default), DISMISSED or ACTIONED; MODERATOR / ADMIN.
- PUT /api/reports/:id/resolve — action: DISMISS or HIDE, resolution; MODERATOR / ADMIN.

Reasons: Spam, Abuse, Duplicate, Other. Description: 1–2000; resolution: 1–1000.
One report per user/idea; repeats/resolving closed reports return 409.
HIDE preserves data, hides content from public access, resolves its pending reports. DISMISS closes one report without hiding the idea. Staff receive new-report notifications; reporter/affected author receive resolution notifications.

## Notifications

- GET /api/notifications — Authenticated; own latest 100 data entries and total unread.
- PUT /api/notifications/:id/read — Recipient only.
- PUT /api/notifications/read-all — Own notifications only.

Records: id,message,ideaId?,readAt?,createdAt. No notification is emitted for every vote.

## Errors

400 invalid input;401 invalid/expired/revoked session;403 forbidden;404 missing/hidden record;409 duplicate/invalid workflow;413 oversized body;429 rate limit;503 missing mail/JWT configuration;500 unexpected server error.
See backend/README.md for local usage/migrations/deployment.

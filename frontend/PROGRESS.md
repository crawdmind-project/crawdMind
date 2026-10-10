# CrowdMind completion

Implemented: authentication/roles, own profile edits/deletion, Admin user management, ideas/tags, voting/change/remove, comments, Under Review → Planned → Done, duplicate suggestions/merge, reports/resolutions, private notifications, expiring single-use password reset.
Pages: Home, Register, Login, Account, Ideas, Leaderboard, Moderation, Users, Forgot/Reset.
API documentation updated. Backend integration tests use real Express/Prisma with embedded PostgreSQL; frontend tests cover API/session/navigation.

## Teacher demo

1. Start both local runners. Open http://localhost:5174/.
2. Member: member@crowdmind.local / CrowdMindLocal2026!.
3. Create/tag/edit/vote/comment. Create a similar idea to see suggestions.
4. Report an idea, sign out.
5. Admin: admin@crowdmind.local / same local password.
6. Moderation: dismiss/hide reports, advance statuses, confirm duplicate merge.
7. Users: update a test role. Last Admin is protected.
8. Member: read notifications; try account edits.
9. Password recovery: local reset link appears in backend/.local-mail.

## Remaining setup

Hosted deployment, real database migration verification, SMTP delivery and final Terms/Privacy documents.
PGlite uses one connection; production PostgreSQL/load testing remains separate.

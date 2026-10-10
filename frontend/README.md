# CrowdMind frontend

Start backend with npm run dev:local, then run npm run dev:local here.
Open http://localhost:5174/ (API localhost:5001).
npm start serves port5173 with API_BASE_URL or the original Render default.

Pages: Home, Login/Register, Account, Ideas, Leaderboard, Moderation, Users, Forgot/Reset Password.
Account supports profile edits, password change and confirmed deletion.
Ideas supports voting with restored selection, comments, tags/filter/sorting, owner edits, reports and confirmed deletion.
New Idea checks similar ideas; submit again to deliberately proceed.
Moderation supports real reports, Take Action (hide), Dismiss Report, workflow and confirmed merge.
Users: Moderators view; Admins edit profiles/roles and confirm deletion.
Notifications show private inbox/unread counts and mark one/all read.

API text uses textContent. Backend authorizes every write. Error states preserve drafts.
npm test runs eight existing API/session/navigation tests.
See ../api-doc.md and ../backend/README.md for integration and deployment.

New features require updated backend/migrations. Local reset mail is in backend/.local-mail; real delivery needs SMTP.
Final Terms/Privacy documents require project input.

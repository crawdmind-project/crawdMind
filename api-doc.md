# CrawdMind API

`https://crawdmind.onrender.com`

Protected: `Authorization: Bearer <jwt>` (from login/register, 24h). JSON: `Content-Type: application/json`.

## Roles & permissions

| Role | Can |
| --- | --- |
| Public | register, login, logout, list ideas, list comments |
| `MEMBER` | own profile; create ideas/comments; edit own ideas; delete own ideas/comments |
| `MODERATOR` | member access + list users, set idea status, delete any idea/comment |
| `ADMIN` | moderator access + update/delete any user |

Default role: `MEMBER`.

## Auth

- `POST /api/auth/register` — `fullName`, `email`, `password` — Public 
- `POST /api/auth/login` — `email`, `password` — Public
- `POST /api/auth/logout` — Public
- `GET /api/auth/me` — Authenticated
- `PUT /api/auth/me` — `fullName?`, `email?`, `password?` — Authenticated
- `DELETE /api/auth/me` — Authenticated
- `GET /api/protected` — Authenticated

## Ideas

- `POST /api/ideas` — `title`, `description` — Authenticated (`status` defaults to `PLANNED`) 
- `GET /api/ideas` — Public
- `PUT /api/ideas/:id` — `title`, `description` — Owner 
- `PUT /api/ideas/:id/status` — `status` (`PLANNED` \| `UNDER_REVIEW` \| `DONE`) — Admin / Moderator 
- `DELETE /api/ideas/:id` — Owner / Admin / Moderator

## Comments

- `POST /api/comments` — `content`, `ideaId` — Authenticated 
- `GET /api/comments/idea/:ideaId` — Public
- `DELETE /api/comments/:id` — Owner / Admin / Moderator

## Admin

- `GET /api/auth/admin/users` — Admin / Moderator
- `PUT /api/auth/admin/users/:id` — `fullName?`, `email?`, `password?`, `role?` — Admin
- `DELETE /api/auth/admin/users/:id` — Admin

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 400 | Missing / invalid fields |
| 401 | Unauthorized (no/bad/expired token) |
| 403 | Forbidden (role or not owner) |
| 404 | Not found |
| 409 | Email already registered |
| 500 | Server error |

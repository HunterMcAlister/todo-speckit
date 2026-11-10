# API Reference

**Status:** Features 1–2. Mount path: `/todo/`.

Flat JSON responses (no `{ success, data }` envelope). Errors: `{ "message": "..." }`.

Authenticated routes require `Authorization: Bearer <token>`.

## Auth

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/todo/register` | No | Create an account and session |
| `POST` | `/todo/login` | No | Authenticate and return the current session |
| `POST` | `/todo/logout` | Yes | Invalidate the bearer session token |

**Register body:** `fName`, `lName`, `email`, `username`, `password`.

**Login body:** `username`, `password`.

**Register success:** `201`. **Login success:** `200`. Both return:

```json
{
  "userId": 1,
  "username": "jdoe",
  "email": "jdoe@example.com",
  "fName": "Jane",
  "lName": "Doe",
  "role": "worker",
  "token": "<jwt>"
}
```

Password hashes are never included. `role` is always `worker` for new accounts. `username` and `email` are stored lowercase.

| Status | When | Message |
|--------|------|---------|
| `400` | Missing email | `Email is required.` |
| `400` | Invalid email | `Enter a valid email address.` |
| `400` | Missing username | `Username is required.` |
| `400` | Missing password | `Password is required.` |
| `400` | Password shorter than 8 characters | `Password must be at least 8 characters.` |
| `400` | Duplicate username | `Username is already taken.` |
| `400` | Duplicate email | `Email is already registered.` |
| `401` | Wrong username or password | `Invalid username or password.` |
| `401` | Missing, unknown, or expired token | `Unauthorized! …` |

Logout success: `200` `{ "message": "Signed out." }`.

## Lists

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/lists` | Yes | Lists owned by `req.user.id`, ordered by name A–Z |
| `POST` | `/todo/lists` | Yes | Create a list owned by `req.user.id` |
| `PUT` | `/todo/lists/:listId` | Yes | Rename a list owned by the caller |
| `DELETE` | `/todo/lists/:listId` | Yes | Delete a list owned by the caller |

**Create / rename body:** `{ "name": "Groceries" }`. A `userId` in the body is ignored. The saved owner is `req.user.id`.

**Create success:** `201`. **Rename success:** `200`. Both return:

```json
{
  "id": 1,
  "name": "Groceries",
  "userId": 42,
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:00:00.000Z"
}
```

**Delete success:** `200` `{ "message": "List deleted." }`.

Names are trimmed. Empty or whitespace-only names return `400` `{ "message": "List name is required." }`. Names longer than 100 characters return `400` `{ "message": "List name must be 100 characters or fewer." }`. A non-numeric `:listId` returns `400` `{ "message": "List id must be a number." }`.

A list id the caller does not own returns `404` `{ "message": "List with id=<id> not found." }`. These routes never return `403`.

Missing or invalid session: `401` `{ "message": "Unauthorized! …" }`.

## Provenance

| Area | Introduced |
|------|------------|
| Register, login, logout | Feature 1 |
| `GET /todo/lists` ownership read | Feature 1 |
| List create, rename, delete | Feature 2 |

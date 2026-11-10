# API Reference

**Status:** Feature 1 integrated on this branch. Mount path: `/todo/`.

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
| `GET` | `/todo/lists` | Yes | Lists owned by `req.user.id`, ordered by name |

Create, update, and delete arrive with Feature 2. This read exists so a valid session can be proven to return only the caller's lists.

## Provenance

| Area | Introduced |
|------|------------|
| Register, login, logout | Feature 1 |
| `GET /todo/lists` ownership read | Feature 1 |

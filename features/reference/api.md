# API Reference

**Status:** Features 1–3. Mount path: `/todo/`.

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

**Delete success:** `200` `{ "message": "List deleted." }`. Todos in that list are removed by the list-to-todo `ON DELETE CASCADE`.

Names are trimmed. Empty or whitespace-only names return `400` `{ "message": "List name is required." }`. Names longer than 100 characters return `400` `{ "message": "List name must be 100 characters or fewer." }`. A non-numeric `:listId` returns `400` `{ "message": "List id must be a number." }`.

A list id the caller does not own returns `404` `{ "message": "List with id=<id> not found." }`. These routes never return `403`.

Missing or invalid session: `401` `{ "message": "Unauthorized! …" }`.

## Todos

All four routes require `Authorization: Bearer <token>`. They return `401` `{ "message": "Unauthorized! …" }` when the token is missing, unknown, or expired. They never return `403`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/lists/:listId/todos` | Yes | Todos in a list the caller owns |
| `POST` | `/todo/lists/:listId/todos` | Yes | Add a todo to a list the caller owns |
| `PUT` | `/todo/todos/:id` | Yes | Update title and/or `completed` on a todo the caller owns |
| `DELETE` | `/todo/todos/:id` | Yes | Delete a todo the caller owns |

**Route parameters:** `:listId` on the list routes; `:id` on the todo routes. A non-numeric `:listId` returns `400` `{ "message": "List id must be a number." }`. A non-numeric `:id` returns `400` `{ "message": "Todo id must be a number." }`.

**Create body:** `{ "title": "Buy milk" }`. `userId` and `listId` in the body are ignored. The saved `listId` is the route `:listId` after the list ownership check. The saved `userId` is `req.user.id`. `completed` is always stored as `false` on create.

**Update body:** `title` and `completed` are each optional. A present `title` is trimmed and validated. A present `completed` is stored as `true` only when the value is boolean `true`; any other value is stored as `false`. `userId` and `listId` are not taken from the body.

**Create success:** `201`. **Update success:** `200`. **List success:** `200` with an array. Each todo is:

```json
{
  "id": 10,
  "title": "Buy milk",
  "completed": false,
  "listId": 1,
  "userId": 42,
  "createdAt": "2026-07-02T12:05:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

`GET` orders rows by `completed` ascending (incomplete first), then `createdAt` ascending. The query includes `listId` and `userId: req.user.id`.

**Delete success:** `200` `{ "message": "Todo deleted." }`.

Titles are trimmed. An empty or whitespace-only title returns `400` `{ "message": "Todo title is required." }`. A title longer than 255 characters returns `400` `{ "message": "Todo title must be 255 characters or fewer." }`.

A `:listId` the caller does not own returns `404` `{ "message": "List with id=<id> not found." }` on `GET` and `POST`. A todo `:id` the caller does not own returns `404` `{ "message": "Todo with id=<id> not found." }` on `PUT` and `DELETE`.

## Provenance

| Area | Introduced |
|------|------------|
| Register, login, logout | Feature 1 |
| `GET /todo/lists` ownership read | Feature 1 |
| List create, rename, delete | Feature 2 |
| Todo list, create, update, delete | Feature 3 |

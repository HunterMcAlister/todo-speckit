# API Reference

**Status:** Features 1–5. Mount path: `/todo/`.

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
| `PUT` | `/todo/todos/:id` | Yes | Update title, `completed`, and/or `dueDate` on a todo the caller owns |
| `DELETE` | `/todo/todos/:id` | Yes | Delete a todo the caller owns |

**Route parameters:** `:listId` on the list routes; `:id` on the todo routes. A non-numeric `:listId` returns `400` `{ "message": "List id must be a number." }`. A non-numeric `:id` returns `400` `{ "message": "Todo id must be a number." }`.

**Create body:** `{ "title": "Buy milk", "dueDate": "2026-07-15" }`. `dueDate` is optional. Omit it or send `null` to store `null`. `userId` and `listId` in the body are ignored. The saved `listId` is the route `:listId` after the list ownership check. The saved `userId` is `req.user.id`. `completed` is always stored as `false` on create.

**Update body:** `title`, `completed`, and `dueDate` are each optional. A present `title` is trimmed and validated. A present `completed` is stored as `true` only when the value is boolean `true`; any other value is stored as `false`. `dueDate` may be a `YYYY-MM-DD` string or `null`. Omitting `dueDate` leaves the stored date unchanged, including when the body is only `{ "completed": true }`. Sending `dueDate: null` clears it. `userId` and `listId` are not taken from the body.

**Create success:** `201`. **Update success:** `200`. **List success:** `200` with an array. Each todo is:

```json
{
  "id": 10,
  "title": "Buy milk",
  "completed": false,
  "dueDate": "2026-07-15",
  "listId": 1,
  "userId": 42,
  "createdAt": "2026-07-02T12:05:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

`GET` returns `dueDate` on every todo. The value is `YYYY-MM-DD` or `null`. `GET` orders rows by `completed` ascending (incomplete first), then `createdAt` ascending. The query includes `listId` and `userId: req.user.id`. `dueDate` does not change that order.

**Delete success:** `200` `{ "message": "Todo deleted." }`.

Titles are trimmed. An empty or whitespace-only title returns `400` `{ "message": "Todo title is required." }`. A title longer than 255 characters returns `400` `{ "message": "Todo title must be 255 characters or fewer." }`. A `dueDate` that is not `null` and not an exact valid `YYYY-MM-DD` date returns `400` `{ "message": "Due date must be a valid date in YYYY-MM-DD format." }` before the row is created or saved.

A `:listId` the caller does not own returns `404` `{ "message": "List with id=<id> not found." }` on `GET` and `POST`. A todo `:id` the caller does not own returns `404` `{ "message": "Todo with id=<id> not found." }` on `PUT` and `DELETE`.

## Profile

Both routes require `Authorization: Bearer <token>`. They return `401` `{ "message": "Unauthorized! …" }` when the token is missing, unknown, or expired. They never return `403`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/todo/users/:id` | Yes | Fetch the caller's own profile |
| `PUT` | `/todo/users/:id` | Yes | Update the caller's own profile |

Access is self only: `:id` must equal `req.user.id` (`getAccessibleUserOrNull`). Any other id returns `404` `{ "message": "User with id=<id> not found." }` and does not change that row.

**Update body:**

```json
{
  "fName": "Jane",
  "lName": "Doe",
  "email": "jane@example.com",
  "username": "jdoe",
  "password": "newpassword123"
}
```

`password` is optional. Omit it, or send an empty string, to leave the current hash unchanged. A non-empty password shorter than 8 characters returns `400` `{ "message": "Password must be at least 8 characters." }` before the other field checks. A password of at least 8 characters is stored as a bcrypt hash (10 salt rounds). `role` in the body is ignored.

`fName`, `lName`, `email`, and `username` are required. Values are trimmed. `username` and `email` are stored lowercase. Empty required fields are rejected. A username longer than 100 characters is rejected.

| Status | When | Message |
|--------|------|---------|
| `400` | Missing or blank first name | `First name is required.` |
| `400` | Missing or blank last name | `Last name is required.` |
| `400` | Missing or blank email | `Email is required.` |
| `400` | Invalid email | `Enter a valid email address.` |
| `400` | Missing or blank username | `Username is required.` |
| `400` | Username longer than 100 characters | `Username must be 100 characters or fewer.` |
| `400` | Password shorter than 8 characters | `Password must be at least 8 characters.` |
| `400` | Username already used by someone else | `Username is already taken.` |
| `400` | Email already used by someone else | `Email is already registered.` |

Saving the caller's current username or email is allowed. A failed update does not change the stored row.

**Success:** `200` for both `GET` and `PUT`. The body is the profile without a password hash:

```json
{
  "id": 42,
  "fName": "Jane",
  "lName": "Doe",
  "email": "jane@example.com",
  "username": "jdoe",
  "role": "worker",
  "createdAt": "2026-07-02T12:00:00.000Z",
  "updatedAt": "2026-07-02T12:05:00.000Z"
}
```

This shape uses `id`. It does not include the session `token` or the login field `userId`.

## Provenance

| Area | Introduced |
|------|------------|
| Register, login, logout | Feature 1 |
| `GET /todo/lists` ownership read | Feature 1 |
| List create, rename, delete | Feature 2 |
| Todo list, create, update, delete | Feature 3 |
| Todo `dueDate` on list, create, and update | Feature 5 |
| `GET` and `PUT /todo/users/:id` | Feature 4 |

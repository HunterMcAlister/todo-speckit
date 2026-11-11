# Data Model Reference

**Status:** Features 1–3 schema. Database: `todospeckit-db` (tests use `todospeckit-db-test`).

## `users`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required |
| `lName` | STRING | Required |
| `email` | STRING | Required, unique, stored lowercase |
| `username` | STRING(100) | Required, unique, stored lowercase |
| `password` | STRING(255) | Required bcrypt hash; excluded by the default scope |
| `role` | STRING(20) | Default `worker` |
| `createdAt` / `updatedAt` | DATE | Sequelize timestamps |

## `sessions`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `token` | STRING(512) | Required JWT |
| `email` | STRING | Required |
| `expirationDate` | DATE | Required; 24 hours from issue |
| `userId` | INTEGER FK | Required, references `users.id` |
| `createdAt` / `updatedAt` | DATE | Sequelize timestamps |

Login reuses a non-expired session for the same user. Logout deletes that session row.

## `lists`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(100) | Required; trimmed; max 100 characters |
| `userId` | INTEGER FK | Required, references `users.id`; set from `req.user.id` on create and never taken from the body |
| `createdAt` / `updatedAt` | DATE | Sequelize timestamps |

Reads, renames, and deletes include `userId: req.user.id`. List responses are ordered by `name` ascending. Deleting a list deletes its todos through `ON DELETE CASCADE`.

## `todos`

| Field | Type | Rules |
|-------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `title` | STRING(255) | Required; trimmed; empty rejected; max 255 characters |
| `completed` | BOOLEAN | Required; default `false`; create always stores `false` |
| `listId` | INTEGER FK | Required; references `lists.id`; set from the route after the list ownership check, not from the body; `ON DELETE CASCADE` |
| `userId` | INTEGER FK | Required; references `users.id`; set from `req.user.id` on create and never taken from the body |
| `createdAt` / `updatedAt` | DATE | Sequelize timestamps |

Reads, updates, and deletes include `userId: req.user.id`. A todo stays on the list and user stored at create. List responses of todos are ordered by `completed` ascending, then `createdAt` ascending.

## Associations

- `User` hasMany `Session`; `Session` belongsTo `User`
- `User` hasMany `List`; `List` belongsTo `User`
- `List` hasMany `Todo` with `onDelete: "CASCADE"`; `Todo` belongsTo `List` with `onDelete: "CASCADE"`
- `User` hasMany `Todo`; `Todo` belongsTo `User`

## Provenance

| Table | Introduced |
|-------|------------|
| `users`, `sessions` | Feature 1 |
| `lists` | Feature 1 (table and read); Feature 2 (create, rename, delete) |
| `todos` | Feature 3 |

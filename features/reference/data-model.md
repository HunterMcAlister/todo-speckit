# Data Model Reference

**Status:** Features 1–2 schema. Database: `todospeckit-db` (tests use `todospeckit-db-test`).

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

Reads, renames, and deletes include `userId: req.user.id`. List responses are ordered by `name` ascending.

## Associations

- `User` hasMany `Session`; `Session` belongsTo `User`
- `User` hasMany `List`; `List` belongsTo `User`

## Provenance

| Table | Introduced |
|-------|------------|
| `users`, `sessions` | Feature 1 |
| `lists` | Feature 1 (table and read); Feature 2 (create, rename, delete) |

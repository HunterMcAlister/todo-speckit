# Data Model Reference

**Status:** Feature 1 schema. Database: `todospeckit-db` (tests use `todospeckit-db-test`).

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
| `name` | STRING(100) | Required |
| `userId` | INTEGER FK | Required, references `users.id` |
| `createdAt` / `updatedAt` | DATE | Sequelize timestamps |

Feature 1 reads this table. Feature 2 adds list create, rename, and delete.

## Associations

- `User` hasMany `Session`; `Session` belongsTo `User`
- `User` hasMany `List`; `List` belongsTo `User`

## Provenance

| Table | Introduced |
|-------|------------|
| `users`, `sessions` | Feature 1 |
| `lists` (read) | Feature 1 |

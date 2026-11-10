# Behavior & Rules Reference

Product rules in force after Feature 1.

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Sign-in uses username and password, not email | `POST /todo/login` | Feature 1, FR-001 |
| Registration collects first name, last name, email, username, and password | Register API and form | Feature 1, FR-002 |
| Passwords are bcrypt hashes with 10 salt rounds and are never returned | `auth.controller`, User `defaultScope` | Feature 1, FR-003 |
| Sessions are a JWT plus a `sessions` row; the client sends `Authorization: Bearer <token>` | `authenticate` | Feature 1, FR-004 |
| A session lasts 24 hours | JWT `expiresIn: 86400` and `expirationDate` | Feature 1, FR-005 |
| Login reuses a non-expired session for that user | `issueSession` | Feature 1, FR-006 |
| New users receive role `worker` | Register ignores any client role | Feature 1, FR-007 |
| Authenticated handlers use `req.user.id` from the session | `authenticate` | Feature 1, FR-008 |
| Email must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | Shared `emailRules` and the register API | Feature 1, FR-009 |
| Duplicate username or email is rejected | `400` with a specific message | Feature 1 |
| Wrong username and wrong password share one message | `401` `Invalid username or password.` | Feature 1 |
| Missing or expired tokens are rejected | `401` `Unauthorized! …`; the axios client clears `user` and routes to login | Feature 1 |
| Username and email are stored lowercase | Register and login normalize with trim + lowercase | Feature 1 |
| `GET /todo/lists` returns only rows for `req.user.id` | List query `where` | Feature 1, US-1.3 |
| Login and register are full-screen pages without a menu bar | Router + `App.vue` | Feature 1 |
| Home shows the user's first name and a Sign out button | `Home.vue` | Feature 1 |
| A stored `user` session skips the login page; no session cannot open home | `router.beforeEach` | Feature 1, US-1.3, US-1.5 |
| The browser session lives in `localStorage` key `user` | `Utils.setStore` / `removeItem` | Feature 1 |

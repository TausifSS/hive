# HIVE Backend

This is the backend layer for the HIVE campus community app. It is a dependency-free Node REST API with SQLite database storage, so it can run inside the current Vite project without installing more packages.

## Run

```bash
npm run backend
```

The API runs on:

```text
http://localhost:4000
```

Use `PORT=5000 npm run backend` if you want another port.

The frontend reads the backend URL from `VITE_API_URL`. The default is already `http://localhost:4000`; copy `.env.example` to `.env` only if you want to change it.

College email login is controlled by:

```text
COLLEGE_EMAIL_DOMAINS=raisoni.net,raisoni.edu,highschool.net,.edu,ghrcem.edu
ADMIN_EMAILS=principal@example.com,admin@example.com
OTP_DELIVERY_MODE=development
RESEND_API_KEY=
OTP_FROM_EMAIL="HIVE <onboarding@resend.dev>"
ADMIN_LOGIN_ID=admin
ADMIN_LOGIN_PASSWORD=admin123
VITE_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_ID=
```

Email matching supports exact domains, subdomains, and suffix rules:

```text
student@raisoni.net              allowed
student@students.raisoni.net     allowed
teacher@college.edu              allowed by .edu
```

New college-email signups are created as normal student accounts. College Admin accounts are issued through `ADMIN_LOGIN_ID` and `ADMIN_LOGIN_PASSWORD`, or by an existing admin changing a user's role in the Admin panel.

For real inbox OTP delivery, set:

```text
OTP_DELIVERY_MODE=email
RESEND_API_KEY=<your-resend-api-key>
OTP_FROM_EMAIL="HIVE <verified@yourdomain.com>"
```

Without those credentials the app stays in development mode and returns the OTP to the frontend for local testing.

## Database

The backend creates a SQLite database automatically on first run:

```text
backend/data/hive.db
```

Tables are created from the schema in `backend/db.mjs`, with a readable copy in `backend/schema.sql`.

The local database files are ignored by git. Delete `backend/data/hive.db` to reset seed data.

## Users

There are no seeded demo users now. Password setup is done from the login screen through college email OTP. Club accounts submit a registration certificate and stay pending until College Admin approval. After approval, they use the same main login as everyone else. Admin login uses `ADMIN_LOGIN_ID` and `ADMIN_LOGIN_PASSWORD`; configure those in `.env` before deployment.

Use the returned session `token` as:

```text
Authorization: Bearer <token>
```

## Current API

```text
GET    /api/health
POST   /api/auth/student-login
POST   /api/auth/student/set-password
POST   /api/auth/google
POST   /api/auth/club-login
POST   /api/auth/club/register
GET    /api/auth/club/status
POST   /api/auth/admin-login
POST   /api/auth/request-otp
POST   /api/auth/verify-otp
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/users
PATCH  /api/users/me
GET    /api/users/:id
POST   /api/users/:id/follow

GET    /api/posts
POST   /api/posts
POST   /api/posts/:id/like
POST   /api/posts/:id/save
POST   /api/posts/:id/comments

GET    /api/events
POST   /api/events
GET    /api/events/:id
POST   /api/events/:id/register

GET    /api/leaderboard

GET    /api/conversations/:otherUserId
POST   /api/conversations/:conversationId/messages

GET    /api/chat/channels/:channelId/messages
POST   /api/chat/channels/:channelId/messages

GET    /api/stories
POST   /api/stories
GET    /api/stories/:id

POST   /api/assistant/message

GET    /api/admin/users
GET    /api/admin/club-applications
PATCH  /api/admin/club-applications/:id/review
PATCH  /api/admin/users/:id/role
PATCH  /api/admin/users/:id/block
DELETE /api/admin/users/:id
```

Main login is password based after OTP verification and works for students, teachers, verified club accounts, and email-based admin accounts. OTP is used for first password setup and forgot-password reset. Local development returns the OTP in the response; production should send it by email through Resend. Session tokens are opaque and only token hashes are stored in `auth_sessions`.

Campus chat channels currently support `global`, `professional`, and `placements`. `POST /api/stories` is College Admin only. The assistant endpoint is a local campus-help responder; it is intentionally not an external AI provider yet.

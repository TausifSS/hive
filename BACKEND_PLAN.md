# Backend Plan

## Phase 1: Working Local API

- Add REST endpoints for auth, users, posts, events, leaderboard, and conversations.
- Seed realistic campus data that matches the current frontend screens.
- Store data in a local SQLite database so the frontend can start integrating immediately. Done.
- Keep the API dependency-free until the product flow is stable. Done.

## Phase 2: Frontend Integration

- Add a frontend API client with a single `VITE_API_URL`. Done.
- Replace hardcoded feed posts with `GET /api/posts`. Done.
- Connect login/register to `/api/auth`. Done.
- Connect events list, details, creation, and registration to `/api/events`. Done.
- Connect leaderboard screens to `/api/leaderboard`. Done.
- Connect profile screens to `/api/users`.
- Connect messages to `/api/conversations`.

## Phase 3: Production Backend

- Move persistence from SQLite to hosted PostgreSQL or MongoDB when deployment needs it.
- Keep password hashing enabled; later upgrade to argon2 or bcrypt if deployment stack supports it.
- Replace demo bearer tokens with database-backed session tokens. Done.
- Replace password login with college-email OTP. Done.
- Add College Admin user controls for role changes, block, and delete. Done.
- Support Raisoni student mail, `.edu` teacher mail, and exact admin emails. Done.
- Add refresh-token rotation or signed JWT access tokens before production deployment.
- Add request validation, pagination, search, and image upload support.
- Add WebSocket or Socket.IO support for live chat.
- Add role permissions for students, club admins, and admins.

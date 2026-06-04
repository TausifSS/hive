# HIVE: Single-Window Campus Engagement Hub
## Master Project Documentation & Pitching Material
**Prepared for:** GH Raisoni College (GHR) Management & Investors  
**Date:** June 2026  
**Version:** 1.0.0

---

## Table of Contents
1. [Product Requirements Document (PRD)](#1-product-requirements-document-prd)
2. [Technical Architecture Document (TAD)](#2-technical-architecture-document-tad)
3. [Security & Access Document (SAD)](#3-security-and-access-document-sad)
4. [Frontend Specification Document (FSD)](#4-frontend-specification-document-fsd)
5. [Feature Ticket List (FTL)](#5-feature-ticket-list-ftl)

---

## 1. Product Requirements Document (PRD)

### 1.1 Problem Statement
In modern educational institutions like GH Raisoni College, campus engagement is severely fragmented.
- **Communication Gaps**: Students miss out on club workshops, tech fests, and cultural events because notifications are scattered across messaging apps (WhatsApp, Telegram) and offline notice boards.
- **Manual Operations**: Club coordinators spend hours manually tracking event registrations, verifying student attendance, and updating attendance registers.
- **Lack of Motivation**: There is no gamification or central system to incentivize students to participate in co-curricular activities, making it difficult for clubs to sustain engagement.
- **Inefficient Query Resolution**: Students struggle to get instant answers about campus schedules, event venues, and guidelines.

### 1.2 Target Users
- **Students (Primary Users)**: Tech-savvy individuals seeking single-window access to all campus fests, easy registration, points tracking, and social interaction.
- **Club Administrators (Organizers)**: Club leads, department coordinators, or faculty coordinators who organize events, scan tickets, and track registrations.
- **College Administrators (Super Users)**: College heads, Deans, or Admin staff who supervise all activities, review club registrations, approve/reject events, and handle moderation.

### 1.3 Product Vision
To build **HIVE**—the ultimate single-window campus engagement hub for GH Raisoni College. HIVE gamifies campus life by tracking student participation through a centralized points leaderboard, automates event workflows with QR-code check-ins, provides a localized campus AI assistant ("Hey GHR"), and centralizes official news and social chats.

### 1.4 Core Features
#### Must-Have (MVP)
- **Centralized Event Management**: Creation, deletion, and editing of events by verified Club Admins.
- **Student Profile & Registration**: Mandatory profile setup (Name, Division, Year, Department) with automated points tracking.
- **QR-Code Attendance System**: Instant event check-in via mobile camera scans of student QR tickets, generating live attendance grids.
- **Campus AI Assistant (Hey GHR)**: Live multilingual (English/Hinglish) assistant integrated with Google Gemini to resolve campus, event, and academic queries.
- **Global & Social Chat**: Real-time messaging channels for peer interaction and direct messages (one-to-one).
- **Leaderboard & Gamification**: Live student ranking based on points earned through event attendance.

#### Nice-to-Have (Post-MVP)
- **Automatic Certificate Generator**: Seamless generation and email delivery of participation certificates after event verification.
- **Push Notifications**: Automated mobile alerts for new fests and upcoming registrations.

### 1.5 App Flow (User Journey)
1. **Onboarding**: Login via College Google Account (restricted to verified domains like `raisoni.net`, `ghrcem.edu`) or via college-email OTP.
2. **Profile Creation**: Mandatory setup of Name, Division, Year, and Department to access the feed.
3. **Discovery**: Scroll through the Home Feed of posts and check the "Events" tab for upcoming campus activities.
4. **Action (Registration)**: Click "Register" on an event, generating a secure QR Ticket inside the student's profile.
5. **Validation (Event Check-in)**: Show the QR Ticket at the event venue. The Club Admin scans it using the HIVE in-app camera scanner, instantly updating the database.
6. **Reward**: Points are instantly credited to the student's profile, updating the live Leaderboard.

---

## 2. Technical Architecture Document (TAD)

### 2.1 Technology Stack
- **Frontend Framework**: React 19, TypeScript, Vite (v7.1.3), Tailwind CSS, Framer Motion (for smooth micro-animations).
- **Backend Runtime**: Node.js, Express.js (custom lightweight API router, avoiding heavy frameworks).
- **Database Engine**: Supabase hosted PostgreSQL (utilizing Transaction Pooler on Port `6543` to bypass Render's outbound IPv6 network constraints).
- **Client Libraries**: `lucide-react` (icons), `html5-qrcode` (camera scanning), `pg` (PostgreSQL client pool).
- **Hosting Platforms**: Vercel (Frontend SPA hosting) and Render (Backend Express Web Service).

### 2.2 Directory Structure
```text
proto1/
├── vercel.json                 # Vercel SPA routing rewrite rules
├── vite.config.ts              # Vite asset and prefix configuration
├── package.json                # Project dependencies and script runner
├── backend/
│   ├── db.mjs                  # DB connections, schema queries, migration scripts
│   └── server.mjs              # Express API routing, SSE streaming, authentication
├── src/
│   ├── App.tsx                 # Main client router and layout wrapper
│   ├── context/
│   │   └── AuthContext.tsx     # Session management and Google OAuth state
│   ├── lib/
│   │   └── api.ts              # Fetch configurations, routes, and local mock API
│   ├── components/             # Reusable UI cards, sidebars, and nav layouts
│   └── pages/                  # HeyGHR (AI), Feed, Events, Admin, Club panels
```

### 2.3 Database Schema (Entity Relationship)
- **users**: `id` (UUID/Primary), `email` (Unique), `name`, `password_hash`, `role` (student/club_admin/Admin), `points`, `div`, `year`, `department`, `blocked_at`, `avatar_url`.
- **sessions**: `token` (Primary), `user_id` (Foreign), `expires_at`.
- **events**: `id` (Primary), `title`, `description`, `category`, `date`, `venue`, `organizer_id`, `capacity`, `points`, `image_url`.
- **event_registrations**: `event_id` (Composite Primary), `user_id` (Composite Primary), `registered_at`, `attended_at` (timestamp, confirms check-in).
- **posts**: `id` (Primary), `author_id`, `content`, `media_url`, `created_at`.
- **post_likes** & **post_saves**: Tracks user reactions and bookmarks.
- **top_stories**: Official college announcements created by admins.

---

## 3. Security & Access Document (SAD)

### 3.1 Authentication Method
- **Google OAuth**: Integrated using Google Identity Services (GSI). The system enforces domain whitelist matching (e.g., must end with `@raisoni.net` or `.edu`), preventing unauthorized Gmail sign-ins.
- **Secure Sessions**: Authentication tokens are passed via the standard HTTP `Authorization: Bearer <token>` header, verified on the backend with database-backed session state (`sessions` table).

### 3.2 User Roles & Permissions
| Role | Privileges | Restrictions |
| :--- | :--- | :--- |
| **Student** | Create posts, comment/like, register for events, view leaderboard, chat with HeyGHR, view own QR code. | Cannot access Admin panels, cannot delete others' posts, cannot scan tickets. |
| **Club Admin** | Create and manage own events, scan student QR codes via in-app camera, verify attendance, export registers. | Cannot delete others' events, cannot block users. |
| **College Admin** | Complete access to user management, block/unblock users, review club registrations, edit/delete any post or event. | Cannot remove their own Admin status (hardcoded safety constraint). |

### 3.3 Integrity & Error Handling
- **Database Syntax Safety**: Explicit conflict targets are defined in all `ON CONFLICT DO NOTHING` statements (e.g., unique constraints on follower lists and registrations) to prevent backend query crashes.
- **Payload Sanitization**: Server limits JSON body size (`MAX_BODY_BYTES = 5MB`) to prevent Denial-of-Service (DoS) buffer overflows.
- **Graceful Fallbacks**: If the external Gemini API is unreachable, the system falls back to regex-based static local rules, ensuring the chatbot remains online.

---

## 4. Frontend Specification Document (FSD)

### 4.1 Design & Color Palette
HIVE uses a sleek, premium light-theme with a modern color system and subtle glassmorphic styling:
- **Primary Color**: Deep Purple (`#7C3AED` - `var(--brand-purple)`) representing innovation.
- **Accent Color**: Indigo (`#4F46E5`) and Soft Pink/Purple gradients.
- **Backgrounds**: Soft Light Purple (`#F5F3FF`) transitioning to Lavender (`#EDE9FE`).
- **Card Backgrounds**: Pure White (`#FFFFFF`) or Glassmorphic white (`rgba(255, 255, 255, 0.9)`) with backdrop blur.
- **Typography**: Sans-Serif system fonts (Inter, -apple-system) with varying weights (`800` for headings, `500` for details).

### 4.2 Spacing & Layout Rules
- **Desktop Grid**: Split-screen dashboard. A sticky left-hand sidebar for navigation, a main scrollable feed in the center, and a sticky right-hand sidebar for events/stories (visible on the home page).
- **Mobile Centered**: Centered layout wrapper locked to a maximum width of `450px`, optimizing it for mobile screen display.
- **Transitions**: CSS variables govern dynamic transitions (`all 0.2s ease`). Active mic buttons pulse visually using CSS animations when recording.

### 4.3 Key Integrations
- **Web Speech API**: Custom integration on the HeyGHR chatbot. Enables browser-based voice-to-text recording, supporting mixed-language English and Hinglish dictation.
- **HTML5 QR Code Scanner**: Mobile camera stream decoder integrated into the Club Admin panel to scan attendance tickets.
- **Live CSV Exporter**: Generates instant download packages for student registrations in standard Excel CSV format.

---

## 5. Feature Ticket List (FTL)

### 5.1 Project Status Checkpoints
- **T-1: Database Migration (Completed)**: Replaced local SQLite (`hive.db`) with hosted Supabase PostgreSQL. Enforced transaction pooling for IPv6 resolution compatibility.
- **T-2: Profile Upgrades (Completed)**: Added mandatory Division, Year, and Department selection fields, displaying validation warnings if empty.
- **T-3: Google OAuth & Auth Flow (Completed)**: Configured Google Client ID credentials on Render & Vercel to restrict sign-ins to Raisoni college accounts.
- **T-4: HeyGHR chatbot Gemini Integration (Completed)**: Integrated Gemini 2.5 Flash API with custom system instructions and live database context injection. Added native Web Speech voice input.
- **T-5: Vercel SPA Routing Rewrite (Completed)**: Integrated rewrite routes in `vercel.json` to handle history back navigation and page reloads safely without hitting Vercel 404s.

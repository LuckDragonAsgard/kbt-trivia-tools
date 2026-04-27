# FALKOR & KBT SYSTEM REBUILD
## Master Plan for Multi-User, Multi-Project Platform

> **NOTE:** This is the unabridged 2026-04-17 strategic plan. The repo also has `falkor-kbt-master-plan.md` (abridged stub). Preserved here for full historical context. **This plan was never shipped as-is** — KBT went the GitHub Pages + Supabase route instead.

---

## PHASE 1: AUTH & USER SYSTEM (WEEKS 1-2)

### 1.1 Authentication Backend (Cloudflare Worker)
- **falkor-auth** worker: Handles login, signup, JWT token generation
- Database: Supabase (auth_users table)
- Features:
  - Email/password registration
  - JWT token (48hr expiry) + refresh tokens
  - Password hashing (bcrypt via worker)
  - Email verification (optional for now)
  - Session management

### 1.2 User Roles & Permissions
```
Roles:
- owner (you) - full access all projects
- project_lead - manage 1+ specific projects
- staff - view/edit assigned tasks + projects
- viewer - read-only access
```

### 1.3 Database Schema (Supabase)
```sql
auth_users (id, email, password_hash, role, created_at, last_login)
user_projects (user_id, project_id, role, permissions)
sessions (user_id, token, expires_at)
audit_log (user_id, action, project_id, timestamp)
```

---

## PHASE 2: FALKOR APP REBUILD (WEEKS 2-4)

### 2.1 Falkor Core Features (Protected Routes)
After login, staff see:
- **Dashboard** (personalized for their role)
  - Their assigned projects (cards)
  - Next 7 days of tasks/events
  - Quick stats (% complete, overdue tasks, etc.)

- **Projects Directory** (searchable, filterable)
  - All 46 projects (filtered by permissions)
  - Status badges, team members, last updated
  - Click to open project room

- **Project Rooms** (per project)
  - Overview tab (description, status, team, deadline)
  - Tasks tab (add, check, assign, due dates)
  - Files tab (upload, share, version history)
  - Timeline/Gantt view (optional)
  - Chat/comments on tasks
  - Activity log

- **My Tasks** (global view)
  - All tasks assigned to user
  - Filter by project, due date, priority
  - Bulk actions (mark complete, reassign)

- **Dispatch Chat** (AI assistant)
  - Same as before, but context-aware per project/user
  - Can ask "what's my priority this week"

- **Team Directory**
  - All staff, their roles, projects
  - Contact info, availability

---

## PHASE 3: KBT SYSTEM (WEEKS 4-6)

### 3.1 Kow Brainer Trivia App (Parallel to Falkor)
**Same architecture, different data model:**

- **Dashboard**
  - Upcoming events (local time)
  - Recent trivia scores/leaderboards
  - Quick stats (venues, attendance, revenue)

- **Events Manager**
  - Create/edit trivia events
  - Assign hosts, venues
  - Generate questions from AI
  - Track RSVPs

- **Questions Bank**
  - Browse all questions by category/difficulty
  - Add new questions (AI-generated or manual)
  - Tag, rate, reuse

- **Scores & Leaderboards**
  - Live scoring during events
  - Season leaderboards
  - Revenue tracking

- **Venues Management**
  - List all venues
  - Booking calendar
  - Capacity, parking, etc.

- **Reports**
  - Revenue by venue/date
  - Attendance trends
  - Team performance

---

## PHASE 4: SHARED INFRASTRUCTURE

### 4.1 Workers
- `falkor-auth` - Login, JWT, session mgmt
- `falkor-api` - Projects, tasks, users (protected)
- `falkor-files` - Upload, store, serve (R2 bucket)
- `kbt-auth` - Same as falkor-auth (separate tokens)
- `kbt-api` - Events, questions, scores (protected)
- `shared-email` - Transactional emails (signup confirm, password reset, event reminders)

### 4.2 Database (Supabase)
- Schema for Falkor (projects, tasks, users, files, etc.)
- Schema for KBT (events, questions, venues, scores, etc.)
- Shared: users table (can have accounts in both systems)

### 4.3 Frontend (React/Vite)
- **falkor.pgallivan.workers.dev** - Falkor app (protected)
  - /login, /signup, /dashboard, /projects/:id, /tasks, /settings, etc.
- **kbt.pgallivan.workers.dev** - KBT app (protected)
  - /login, /dashboard, /events, /questions, /venues, /scores, etc.

---

## PHASE 5: DEPLOYMENT

### 5.1 Stack
```
Frontend:
- React + TypeScript
- Vite (bundler)
- TailwindCSS (styling)
- React Router (navigation)
- TanStack Query (state management)
- Supabase client library

Backend:
- Cloudflare Workers (serverless)
- Supabase PostgreSQL (database)
- R2 (file storage)
- SendGrid (emails)

Deployment:
- Falkor frontend → Cloudflare Pages
- KBT frontend → Cloudflare Pages
- Both workers auto-deploy to Cloudflare
```

---

## TECHNICAL DESIGN: LOGIN FLOW

### User Signs Up
```
1. User enters email + password on /signup
2. Frontend calls falkor-auth POST /signup
3. Worker hashes password, creates user in Supabase
4. Sends verification email
5. User clicks link, email confirmed
6. User can now login
```

### User Logs In
```
1. User enters email + password on /login
2. Frontend calls falkor-auth POST /login
3. Worker checks password, creates JWT token
4. Token stored in httpOnly cookie + localStorage
5. Redirect to /dashboard
6. All API calls include token in Authorization header
7. Backend validates token on every request
```

### API Call (Protected)
```
1. User requests GET /api/projects
2. Frontend includes Authorization: Bearer <token>
3. falkor-api worker validates token
4. If valid → fetch from Supabase, return projects
   If invalid → return 401, frontend redirects to /login
```

---

## IMMEDIATE NEXT STEPS

### Week 1 Actions:
1. Design Supabase schema (done in plan)
2. Build falkor-auth worker (JWT, password hashing)
3. Build falkor-api worker (CRUD for projects/tasks/users)
4. Create React app skeleton with login/signup pages
5. Deploy to staging

### Week 2 Actions:
1. Build dashboard + projects directory
2. Build project room (overview, tasks, chat)
3. Test with mock staff (Jacky, etc.)
4. User feedback loop

### Week 3-4:
1. Polish Falkor features
2. Start KBT system (parallel build)

---

## ESTIMATED TIMELINE
- **Auth + API:** 3-4 days
- **Falkor MVP:** 1 week
- **Falkor Polish:** 3-4 days
- **KBT System:** 1 week
- **Testing + Deployment:** 3-4 days

**Total: 4-5 weeks** (with 2-3 people, or solo: 8-10 weeks)

---

## SUCCESS METRICS
- Staff can login with email/password
- Each staff member sees only their projects/tasks
- Can create, edit, assign tasks in project rooms
- KBT has independent login + event management
- Zero broken features (tests pass)

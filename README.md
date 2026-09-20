# AgencyFlow — Real-Time Client Project Dashboard

Production-ready agency project management system with **React, Node.js, Express, PostgreSQL, Native WebSockets, RBAC, JWT authentication, and automated overdue-task scheduling**.

## Features

* **RBAC:** Admin, Project Manager, Developer
* **API-level authorization:** Role and resource ownership validated server-side
* **Native WebSockets:** Real-time task/activity updates, presence, notifications
* **Activity feed:** Persistent task status history
* **Overdue scheduler:** `node-cron` runs every 60 seconds
* **Notifications:** PostgreSQL persistence + real-time WebSocket alerts
* **Authentication:** Short-lived access token in memory + `HttpOnly, SameSite=Lax` refresh cookie
* **Auto token refresh:** HTTP `401` interceptor
* **Shareable filters:** Status, priority, and due-date filters stored in URL parameters

##  Seed Accounts

| Role            | Email                 | Password   |
| --------------- | --------------------- | ---------- |
| Admin           | `admin@agency.com`    | `admin123` |
| Project Manager | `ravi@agency.com`     | `pm123`    |
| Project Manager | `elena.pm@agency.com` | `pm123`    |
| Developer       | `alex@agency.com`     | `dev123`   |
| Developer       | `sarah@agency.com`    | `dev123`   |
| Developer       | `marcus@agency.com`   | `dev123`   |
| Developer       | `priya@agency.com`    | `dev123`   |

> Development credentials only. Replace them in production.

## Local Setup

### Docker — Preferred

```bash
git clone <YOUR_REPOSITORY_URL>
cd agencyflow
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Stop:

```bash
docker compose down
```

### Node.js + PostgreSQL

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Production:

```bash
npm run build
npm start
```

Required environment:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/agencyflow
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

##  Database Schema

```text
clients 1 ─── N projects 1 ─── N tasks
users   1 ─── N projects
users   1 ─── N tasks
users   1 ─── N activity_logs
users   1 ─── N notifications
```

Main tables:

* `users` — users and roles
* `clients` — agency clients
* `projects` — client projects and managers
* `tasks` — assignments, status, priority, due dates
* `activity_logs` — persistent project/task activity
* `notifications` — persistent user notifications

Important indexes:

```text
idx_tasks_overdue (is_overdue, status)
idx_tasks_assigned (assigned_to)
idx_activity_created (created_at DESC)
idx_notif_user_unread (user_id, is_read)
```

##  Architecture

```text
React/Vite
    │
    ├── REST API ──→ Express ──→ PostgreSQL
    │
    └── WebSocket ─→ WebSocket Server
                          │
                          └── Real-time events

node-cron ──→ Overdue Tasks ──→ PostgreSQL + WebSocket
```

##  Architectural Decisions

### WebSocket

**Native WebSocket** was chosen instead of Socket.IO because the application needs simple real-time updates, presence, and notifications without Socket.IO-specific overhead.

### Job Queue

**node-cron** was chosen because the current overdue check is a simple 60-second periodic job. For multi-instance scaling, **BullMQ + Redis** would be a future option.

### Token Storage

* Access token → frontend memory
* Refresh token → `HttpOnly`, `SameSite=Lax` cookie
* No tokens stored in `localStorage`

This reduces persistent browser exposure while allowing automatic session renewal.

## Real-Time Flow

```text
Task Update
    ↓
Authenticate
    ↓
RBAC + Ownership Check
    ↓
Update PostgreSQL
    ↓
Create Activity Log
    ↓
Broadcast WebSocket Event
```

On reconnect, the application retrieves the latest **20 activity events** from PostgreSQL.

##  Known Limitations

* `node-cron` is not a distributed job queue.
* WebSocket presence is maintained in server memory.
* Multiple backend instances require Redis/pub-sub for WebSocket synchronization.
* Reconnection catch-up is limited to the latest 20 events.
* Seed credentials are for development only.
* No distributed cache is currently required.

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Axios
**Backend:** Node.js, Express, TypeScript, Native WebSocket, node-cron
**Database:** PostgreSQL
**Infrastructure:** Docker, Docker Compose

## Production Checklist

* Replace seed passwords
* Generate strong JWT secrets
* Enable HTTPS
* Configure secure CORS/cookies
* Disable persona switcher
* Add rate limiting
* Configure database backups
* Use Redis/BullMQ when horizontally scaling

---

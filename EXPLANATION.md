# Technical Assessment & Architecture Explanation

## Three Mandatory Questions 

### 1. What was the most technically challenging part of this build and how did you solve it?
The primary challenge was guaranteeing absolute real-time security parity between the REST endpoints and the WebSocket broadcast pipeline. If an unprivileged developer were to receive broadcasted task payloads belonging to another developer or project via an open socket channel, the RBAC model would fail. We solved this by creating a server-authoritative socket registry mapping client socket connections to their verified JWT identity. When a task status change or cron notification triggers, the server evaluates database ownership at the socket layer before sending, ensuring unauthorized sockets never receive packets.

### 2. How did you approach the real-time activity feed to ensure users only see what they're permitted to see?
Scoping is enforced at the PostgreSQL query layer rather than filtered in client-side memory. Developers execute queries restricted by `assigned_to = user.id`, Project Managers by project creator ID, and Admins across all projects. For real-time broadcasts, the event emitter runs the same predicate before routing socket frames. Reconnecting clients fetch the last 20 persisted database records to prevent stale state.

### 3. If you had another day on this project, what is the first thing you would refactor or add?
If given an additional day, I would replace the single-node in-memory WebSocket connection map with a Redis Pub/Sub adapter or Postgres LISTEN/NOTIFY channel, allowing horizontal multi-replica clustering across containers while maintaining unified presence and broadcast dispatch.

---

## Architecture Decisions

### 1. WebSocket Library Choice
We selected the native **`ws`** library over Socket.io to eliminate bloated client runtimes and avoid proprietary protocol wrapping. Native WebSockets provide lightweight RFC 6455 compliance, direct integration with Node's native HTTP server, and sub-millisecond presence broadcasting without protocol translation overhead.

### 2. Background Job / Task Scheduler
We selected **`node-cron`** to run an overdue task scanner every 60 seconds directly in the application container. This provides a self-contained, dependable scheduler without introducing heavy external Redis or Celery dependencies, while executing atomic SQL updates, creating persistent notifications, and broadcasting alerts in real time.

### 3. Authentication & Token Storage
We implemented a dual JWT strategy. The **Refresh Token** is stored in an `HttpOnly`, `SameSite=Lax` cookie, preventing client-side JavaScript access and eliminating XSS theft vectors. Short-lived (15-minute) **Access Tokens** remain in memory, automatically renewed via an HTTP 401 interceptor when expired.

---

## Database Schema & Indexing Decisions

### Schema Structure
The system uses 6 relational tables with strict foreign keys:
- `users`: Credentials, full names, roles (`ADMIN`, `PROJECT_MANAGER`, `DEVELOPER`), and avatars.
- `clients`: Client businesses and corporate contact info.
- `projects`: Client projects linked to creator (`created_by`) and `client_id` (`ON DELETE CASCADE`).
- `tasks`: Work deliverables with priority, due date, status, assignee, and overdue flag.
- `activity_logs`: Immutable audit trail recording user, task, project, timestamp, previous status, and new status.
- `notifications`: User-directed in-app notifications with read status flags.

### Performance Indexing Strategy
1. **`idx_tasks_overdue (is_overdue, status)`**: Composite index that accelerates the background scheduler by rapidly isolating non-done tasks approaching due date without sequential scans.
2. **`idx_tasks_assigned (assigned_to)`**: Accelerates Developer RBAC queries, restricting result sets to assigned tasks in O(log n) time.
3. **`idx_projects_created_by (created_by)`**: Enforces fast Project Manager scoping queries.
4. **`idx_activity_created (created_at DESC)`**: Optimizes reverse chronological feed pagination for the "last 20 events" catchup query.
5. **`idx_notif_user_unread (user_id, is_read)`**: Allows instant calculation of unread notification badges.

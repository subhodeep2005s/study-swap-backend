# StudySwap AI Companion Audit Report

## 1. Existing Relevant Architecture
The StudySwap backend is a well-structured Express + TypeScript application utilizing PM2 (assumed due to lock requirements), PostgreSQL, and Redis. It follows a Service/Repository/Controller pattern.

- **Authentication**: JWT-based authentication with `users` mapping to specific roles (`student`, `mentor`).
- **Database**: PostgreSQL mapped via native `pg` queries. Uses `node-pg-migrate` for versioned `.sql` migrations.
- **Cache/Locks**: Redis is heavily utilized for Socket.IO state mapping (`socket:<id>`, `presence:<id>`) and distributed cron locks (`communication:scheduler_lock`).
- **Realtime**: Socket.IO integrated with Redis adapter. Used for `call_ended` and `focus_ended` events.
- **Third-Party Integrations**: AWS S3 for media, Resend for emails, LiveKit for video sessions, Google Calendar OAuth.

## 2. Existing Data Models (Source of Truth)
- `users`: Core identity table (UUID `id`, `email`, `role`, `onboarding_completed`).
- `profiles`: Demographic and academic state (`country_id`, `age`, `strong_in`, `need_help_with`, `study_time`).
- `exams` & `user_exams`: Academic tracking linking users to target goals.
- `communication`: Focus sessions and calls exist in `communication.repository.ts`, which tracks `caller_id`, `room_name`, and statuses (missed, completed, cancelled).

## 3. Existing Notification & Scheduler Infrastructure
- **Scheduler**: A `node-cron` implementation exists (`src/modules/communication/communication.scheduler.ts`) utilizing `redis.set(..., "NX")` for PM2-safe cluster execution locks. It runs every 30 seconds for missed calls/focus sessions.
- **Notifications**: `NotificationService.sendToUser(userId, title, body, payload)` is active and handles delivery. Push notification tokens are stored in the DB (via `1783134915967_add_notification_token.sql`).
- **Emails**: Handled via Resend (`src/config/resend.ts`) and React/HTML templates in `email-templates.ts`.

## 4. Proposed Integration Architecture for AI Companion
- **AI Core**: Build `src/modules/ai-companion/` containing `ai.controller.ts`, `ai.service.ts`, `ai.repository.ts`, and `ai.scheduler.ts`.
- **Database Additions**:
  - `ai_conversations`: Tracks thread contexts (userId, title).
  - `ai_messages`: Cursor-paginated history (role: 'user' | 'model', content).
  - `study_plans`: Top-level daily/weekly goals linked to `user_id`.
  - `study_tasks`: Individual actionable steps with statuses (`pending`, `completed`, `skipped`, `rescheduled`), durations, and linked `exam_id`/`subject`.
  - `study_progress_daily`: Aggregated materialized view or tracked table for quick AI context retrieval.
- **AI Prompt Context Assembly**: When user messages the AI, `ai.service.ts` will fetch user profile demographics, `user_exams`, and `study_progress_daily` to inject into the system instruction secretly before querying Gemini.
- **Structured Tools**: Utilize Google GenAI function calling (`tools`) to allow Gemini to execute `CREATE_STUDY_PLAN`, `RESCHEDULE_TASK`, and `GET_PROGRESS`. The service layer will validate and execute these against the DB.

## 5. Security & Conflicts Addressed
- **Secret Management**: `GEMINI_API_KEY` was found duplicated in `.env`. It has been sanitized. It is already securely loaded via `src/config/env.ts` and never exposed.
- **Scheduler Conflicts**: We must create a new unique Redis lock key (`ai:scheduler_lock`) for AI cron jobs to prevent collision with the `communication:scheduler_lock`.
- **Rate Limiting**: AI endpoints will be wrapped in `express-rate-limit` using a Redis store to prevent runaway token billing. 

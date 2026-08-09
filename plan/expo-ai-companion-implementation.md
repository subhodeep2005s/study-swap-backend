# Expo AI Companion Implementation Guide

This guide details how to implement the AI Companion inside the StudySwap Expo application using the newly created backend APIs.

## 1. Authentication & Base URL
Ensure all requests include the student's JWT in the `Authorization` header:
`Authorization: Bearer <token>`

The AI endpoints are mounted under `/ai`.

## 2. Conversations List & Chat UI
### Fetch History
**Endpoint**: `GET /ai/conversations`
Renders a list of the user's past AI chats.

**Response**:
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "title": "My Physics Routine", "updated_at": "..." }
  ]
}
```

### Create New Chat
**Endpoint**: `POST /ai/conversations`
**Body**: `{ "title": "Math Review" }`

### Load Messages (Cursor Paginated)
**Endpoint**: `GET /ai/conversations/:id/messages?limit=20&cursor=<oldest_msg_date>`
Use this to implement "pull to load more" inside your chat `FlatList`.

### Send Message
**Endpoint**: `POST /ai/conversations/:id/messages`
**Body**: `{ "content": "Help me plan my day." }`

*Note: The backend will seamlessly parse this, pass it to Gemini, generate a study plan via GenAI Tools if requested, and return the final AI text response.*

## 3. Study Routine & UI
The backend handles GenAI converting conversational text into structured Tasks in PostgreSQL.

### Fetch Today's Routine
**Endpoint**: `GET /ai/routines/today`

**Response**:
```json
{
  "success": true,
  "data": {
    "plan": {
      "planned_minutes": 120,
      "actual_minutes": 0
    },
    "stats": {
      "completed_tasks": 0,
      "total_tasks": 2
    },
    "tasks": [
      {
         "id": "uuid",
         "title": "Study Calculus",
         "subject": "Math",
         "duration": 60,
         "status": "pending",
         "priority": "high"
      }
    ]
  }
}
```

### Update Task Status
Use this to allow the user to manually mark tasks as complete in the UI without talking to the AI.
**Endpoint**: `POST /ai/routines/tasks/:id/status`
**Body**: `{ "status": "completed" }` (Valid: `completed`, `skipped`, `rescheduled`, `pending`).

## 4. Notifications & Deep Linking
The backend uses PM2-safe `node-cron` with Redis locking to send notifications:
1. **Upcoming Task**: Fired 15 minutes before `task.start_time`.
2. **Missed Task**: Fired if a task is pending 1 hour after `task.start_time`.

### Deep Linking
When the push notification arrives, it contains a payload:
`{ "type": "upcoming_task", "taskId": "..." }`
Use Expo Linking to route the user directly to the "Today's Plan" screen and highlight the specific task.

## 5. Security & Rate Limiting
- **Chatting**: Limited to 30 messages per 10 minutes per user. If the user hits this, the API returns `429 Too Many Requests`. The frontend should render a graceful "Please wait a few minutes before sending more messages." error.
- **Privacy**: Students can only access their own conversations. Any attempt to pass another user's conversation ID will result in `404 Not Found`.

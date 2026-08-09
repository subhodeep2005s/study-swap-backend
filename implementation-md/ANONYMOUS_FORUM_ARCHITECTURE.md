# Anonymous Forum Architecture

## 1. Overview
The Anonymous Forum allows students to safely share personal stories, discuss exam pressure, ask questions, and seek advice without revealing their real identities.

## 2. Core Privacy Principle
- Users are assigned a persistent anonymous identity (e.g., "Anonymous Bright Fox").
- The public API **never** exposes the real `user_id`, email, or profile ID.
- The backend internally maps the `anonymous_profile_id` back to the real `user_id` strictly for moderation, notifications, and abuse prevention.

## 3. Database Architecture (14 Tables)
- **`anonymous_profiles`**: Maps a `user_id` to a unique `display_name` and `avatar_url`. 
- **`anonymous_categories`**: Defines topics like "Exam Stress", "Success Stories".
- **`anonymous_posts`**: Stores the main content, `category_id`, and `type` (STORY, QUESTION, POLL, etc.).
- **`anonymous_post_media`**: Tracks S3 metadata (key, URL, MIME type, size) for images, videos, and documents attached to posts.
- **`anonymous_polls` / `anonymous_poll_options` / `anonymous_poll_votes`**: Standard structure for polling with unique constraints to prevent double-voting.
- **`anonymous_comments`**: Supports flat or single-level nested replies (`parent_comment_id`).
- **`anonymous_post_likes` / `anonymous_comment_likes` / `anonymous_post_me_too` / `anonymous_saved_posts`**: Action-tracking tables with composite primary keys `(user_id, entity_id)` to ensure idempotency and prevent duplicates.
- **`anonymous_reports`**: Moderation table tracking flagged content.
- **`anonymous_blocks`**: Allows users to block an `anonymous_profile_id`, filtering their content from feeds.

## 4. Media & S3 Strategy
- To save node memory and prevent bottlenecks, media upload uses **S3 Presigned URLs**.
- The client requests a presigned URL with `uploadType: 'forum-media'` or `'anonymous-avatar'`.
- The backend authorizes the request and issues a 5-minute presigned PUT URL.
- The client uploads directly to S3.
- The client passes the resulting `objectKey` and `url` when calling `POST /forum/posts`.

## 5. Security & Rate Limiting
- **Authentication**: All forum interactions require a valid JWT. The user's real ID is extracted from `req.user.id`.
- **Validation**: Strict schema validation using Zod (`forum.schema.ts`).
- **Rate Limiting**: Utilizes Redis atomic increments (`.incr` + `.expire`) via `rateLimitMiddleware`.
  - Profile generation: 10/hour
  - Posts: 5/10 mins
  - Comments: 20/10 mins
  - Reactions: 60/min
  - Poll votes: 20/min
  - Reports: 5/hour

## 6. Realtime & Notifications
- When a user likes or comments on a post, the backend looks up the original post owner's real `user_id`.
- A push notification is sent using Expo via `NotificationService.sendToUser()`.
- The notification obfuscates the sender's identity (e.g., "Anonymous Panda commented on your post.").

## 7. Moderation
- Content can be soft-deleted (`status = DELETED`).
- Reports are categorized by reason (`SPAM`, `HARASSMENT`, etc.).
- Admin capabilities can easily plug into these tables since the real `user_id` mapping is maintained.

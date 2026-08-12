# Hall of Fame API Documentation

This document outlines the API endpoints, query parameters, request bodies, and response structures for the Hall of Fame module. This is intended for frontend developers (Expo React Native and Admin Web) to get started with integrating the endpoints.

---

## 📱 Public & Student Endpoints

Base Path: `/hall-of-fame`
Authentication: Optional (Passing a `Bearer` token enriches the response with the user's interaction state like `liked`, `saved`, `helpful`).

### 1. Browse Stories
`GET /hall-of-fame`

**Query Parameters:**
- `page` (optional, number): Page number.
- `limit` (optional, number): Items per page (default: 20).
- `cursor` (optional, string): ISO date string for cursor-based pagination (supported when sorting by latest).
- `search` (optional, string): Search by title, description, or person name.
- `country_id` (optional, UUID): Filter by country.
- `education_node_id` (optional, UUID): Filter by education node.
- `achievement_type` (optional, string): Filter by type (e.g. `EXAM_CLEARED`, `SCORE_IMPROVEMENT`).
- `achievement_year` (optional, number): Filter by year (e.g. 2026).
- `sort` (optional, string): `latest`, `oldest`, `trending`, `most_liked`, `most_helpful`, `most_saved`.

**Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Stories fetched",
  "data": [
    {
      "id": "uuid",
      "title": "From 72% to 96.3%",
      "short_description": "A JEE comeback journey",
      "story": "Full markdown string...",
      "person_name": "Rahul Kumar",
      "person_role": "Student",
      "achievement_type": "EXAM_CLEARED",
      "achievement_year": 2026,
      "result_label": "Percentile",
      "result_before": "72%",
      "result_after": "96.3%",
      "media_type": "IMAGE",
      "media_url": "https://s3-bucket/hall-of-fame/key.jpg",
      "thumbnail_url": "https://s3-bucket/hall-of-fame/key.jpg",
      "views_count": 1024,
      "likes_count": 50,
      "helpful_count": 12,
      "saves_count": 5,
      "comments_count": 2,
      "published_at": "2026-08-11T12:00:00.000Z"
    }
  ],
  "nextCursor": "2026-08-11T10:00:00.000Z"
}
```

### 2. Get Single Story
`GET /hall-of-fame/:id`

**Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Story fetched",
  "data": {
    "id": "uuid",
    "title": "From 72% to 96.3%",
    "story": "Full markdown string...",
    // ... other fields
    "country": {
      "id": "uuid",
      "name": "India"
    },
    "education_nodes": [
      {
        "id": "uuid",
        "name": "JEE Main",
        "node_type": "EXAM"
      }
    ],
    "viewer": {
      "liked": true,
      "helpful": false,
      "saved": true
    }
  }
}
```
*(Note: `viewer` object is populated with actual user interactions if a valid Bearer token is provided. Otherwise, all values default to `false`.)*

### 3. Get Available Filters
`GET /hall-of-fame/filters`

**Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Filters fetched",
  "data": {
    "years": [2026, 2025, 2024],
    "achievement_types": ["EXAM_CLEARED", "SCORE_IMPROVEMENT"],
    "countries": [
      { "id": "uuid", "name": "India" }
    ]
  }
}
```

### 4. Special Feeds
- `GET /hall-of-fame/featured` (Returns top 10 featured stories)
- `GET /hall-of-fame/trending` (Sorted by custom trending algorithm)
- `GET /hall-of-fame/recommended` (Requires Auth - matches user's education nodes and country)
- `GET /hall-of-fame/saved` (Requires Auth - returns stories saved by the user)

### 5. Interactions (Require Auth)
All interaction endpoints return a generic success message.
- `POST /hall-of-fame/:id/view`
- `POST /hall-of-fame/:id/like`
- `DELETE /hall-of-fame/:id/like`
- `POST /hall-of-fame/:id/helpful`
- `DELETE /hall-of-fame/:id/helpful`
- `POST /hall-of-fame/:id/save`
- `DELETE /hall-of-fame/:id/save`

**Generic Response:**
```json
{
  "success": true,
  "message": "Story liked",
  "data": {}
}
```

### 6. Comments (Require Auth to Write)
`GET /hall-of-fame/:id/comments` (Auth Optional)
`POST /hall-of-fame/:id/comments` (Requires Auth)

**POST Request Body:**
```json
{
  "content": "This is so inspiring!",
  "parent_comment_id": "uuid-for-nested-replies-optional"
}
```

---

## 💻 Admin Endpoints

Base Path: `/admin/hall-of-fame`
Authentication: Requires `Bearer` token with `admin` role.

### 1. Dashboard Stats
`GET /admin/hall-of-fame/stats`

**Response Body (200 OK):**
```json
{
  "success": true,
  "message": "Stats fetched",
  "data": {
    "total_stories": 45,
    "published_stories": 40,
    "drafts": 5,
    "featured": 3,
    "total_views": 15000,
    "total_likes": 2300,
    "total_helpful": 450,
    "total_saves": 120,
    "total_comments": 80
  }
}
```

### 2. Create Story
`POST /admin/hall-of-fame`

**Request Body:**
```json
{
  "title": "Story Title",
  "short_description": "Short summary",
  "story": "Full markdown content...",
  "person_name": "John Doe",
  "person_role": "Student",
  "country_id": "uuid",
  "education_node_ids": ["uuid1", "uuid2"],
  "achievement_type": "EXAM_CLEARED",
  "achievement_year": 2026,
  "result_label": "Percentile",
  "result_before": "80%",
  "result_after": "99%",
  "media_type": "IMAGE",
  "media_key": "s3-key.jpg",
  "thumbnail_key": "s3-thumbnail-key.jpg",
  "status": "DRAFT",
  "is_featured": false
}
```

### 3. Lifecycle Management
- `POST /admin/hall-of-fame/:id/publish`
- `POST /admin/hall-of-fame/:id/unpublish`
- `POST /admin/hall-of-fame/:id/feature`
- `DELETE /admin/hall-of-fame/:id/feature`
- `DELETE /admin/hall-of-fame/:id` (Soft delete/Archive)
- `POST /admin/hall-of-fame/:id/restore`

*(All return standard success JSON)*

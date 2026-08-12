# Notes Hub – Expo (React Native) Implementation Plan

## 1. Overview
This document outlines the detailed plan to integrate the **Notes Hub** feature into the frontend Expo (React Native) app. It connects to the fully implemented StudySwap backend and covers everything from routes, payloads, error handling, to performance optimizations.

---

## 2. Global State & Context Management

### 2.1 Notes Store (Zustand or Redux)
To manage the Notes Hub smoothly without excessive API calls, implement a global state manager that caches fetched notes, saved notes, and upload status.

```typescript
interface NotesState {
  // Discovery
  feedNotes: Note[];
  feedCursor: string | null;
  feedIsLoading: boolean;
  
  // My Uploads & Saves
  myNotes: Note[];
  savedNotes: Note[];
  
  // Taxonomies
  educationNodes: EducationNode[];
  
  // Actions
  fetchFeed: (params: FetchParams, loadMore: boolean) => Promise<void>;
  toggleSaveNote: (noteId: string) => Promise<void>;
  rateNote: (noteId: string, rating: number) => Promise<void>;
}
```

---

## 3. Route Handlers & Integration Specs

### A. Note Discovery & Search (`GET /notes`)
**Purpose:** Fetch the feed of notes for students, with pagination and filtering.

- **Endpoint:** `GET /notes`
- **Query Params:**
  - `cursor` (string): For pagination (Base64 encoded string from previous response).
  - `limit` (number): Defaults to 20.
  - `q` (string): Search text.
  - `educationNodeId` (UUID): Filter by specific exam/class/subject.
  - `noteType` (Enum): `LECTURE_NOTES`, `REVISION_NOTES`, `SHORT_NOTES`, `FORMULA_SHEET`, `PYQ`, etc.
  - `sort` (Enum): `newest`, `highest_rated`, `most_viewed`, `most_downloaded`.
- **Response Data:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "uuid",
          "title": "Kinematics 101",
          "note_type": "SHORT_NOTES",
          "file_url": "https://s3...",
          "uploader": { "name": "John", "role": "mentor" },
          "average_rating": "4.5",
          "is_saved_by_me": false,
          "has_rated_by_me": 4
        }
      ],
      "nextCursor": "encoded_string"
    }
  }
  ```
- **Edge Cases & Optimizations:**
  - **FlatList/FlashList:** Use `@shopify/flash-list` for smooth rendering of endless scrolling.
  - **Debounced Search:** Delay API calls by 500ms when the user is typing in the search bar.
  - **Optimistic UI:** When a user toggles the "Save" bookmark, update `is_saved_by_me` instantly in local state before the API call finishes.

### B. Uploading a Note (Multi-step)
**Purpose:** Allow Students/Mentors to upload PDF/Image notes.

#### Step 1: Pre-signed URL (`POST /notes/presigned-url`)
- **Body:** `{ "fileName": "physics.pdf", "contentType": "application/pdf" }`
- **Response:** `{ "success": true, "data": { "uploadUrl": "https...", "fileKey": "notes/uuid.pdf" } }`

#### Step 2: S3 Upload (Direct PUT)
- Execute an HTTP `PUT` using `fetch` or `axios` directly to the `uploadUrl`.
- **Optimization:** Use `expo-file-system` (`FileSystem.uploadAsync`) to upload large files securely in the background.

#### Step 3: Create Note Record (`POST /notes`)
- **Body:**
  ```json
  {
    "title": "Physics Final Revision",
    "description": "Formulas for mechanics.",
    "noteType": "REVISION_NOTES",
    "educationNodeIds": ["uuid-1", "uuid-2"], // IMPORTANT: Must be array
    "fileKey": "notes/uuid.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1048576,
    "pageCount": 10,
    "fileHash": "hex_string_of_file"
  }
  ```
- **Validators on Frontend (React Hook Form + Zod):**
  - Require at least 1 `educationNodeId`.
  - Max file size (e.g., 50MB). Validate using `expo-document-picker`.
- **Edge Case:**
  - **Duplicate Files:** The API will return `409 Conflict` if the `fileHash` already exists. Show a friendly error: "This file has already been uploaded."

### C. Note Interactions (Save, View, Rate)

1. **Record a View (`POST /notes/:id/view`)**
   - Call this silently in the background when the user opens a note (using a `useEffect`).
2. **Toggle Save (`POST /notes/:id/save` & `DELETE /notes/:id/save`)**
   - Apply Optimistic UI updates. Revert state if the API fails and show a Toast message.
3. **Rating (`POST /notes/:id/rating` / `PATCH /notes/:id/rating`)**
   - **Body:** `{ "rating": 5 }` (1-5 integer).
   - Use a bottom sheet or a modal after the user closes the PDF viewer.

---

## 4. UI/UX Guidelines

1. **PDF Viewer:**
   - Do NOT try to render complex PDFs with basic `WebView`. Use `react-native-pdf` for robust offline viewing and pagination tracking.
2. **Skeleton Loaders:**
   - Display skeleton cards (shimmer effect) while fetching the initial feed from `/notes`.
3. **Empty States:**
   - Display a beautifully illustrated empty state if the search yields zero results, with a CTA: "Be the first to upload notes for this topic!"
4. **Metadata Badges:**
   - Explicitly display the uploader's role with colored badges (e.g., `Student`, `Mentor`, `Admin`) to build trust.

---

## 5. Caching & Offline Strategy

- **Caching Library:** Use `@tanstack/react-query` to cache Note Feed responses for 5 minutes.
- **Offline Access:**
  - When a user taps "Download", use `expo-file-system` to save the PDF to local storage.
  - Store a SQLite (`expo-sqlite`) or `AsyncStorage` registry of locally available `file_url` -> `local_uri`.
  - Check local storage before streaming the PDF from S3.

## 6. Implementation Milestones

1. **Phase 1: API Integration Layer:** Set up Axios instances and React Query hooks for `/notes`.
2. **Phase 2: Discovery Feed:** Build the UI for endless scrolling, filtering bottom-sheets, and search.
3. **Phase 3: Upload Flow:** Integrate Document Picker, S3 uploads, and the creation form.
4. **Phase 4: Consumption & Offline:** Implement PDF Viewer, rating UI, and local file caching.

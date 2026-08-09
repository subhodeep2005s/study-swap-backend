# StudySwap Communication Module — Expo React Native Implementation Guide

> **Purpose**: Complete API reference + implementation blueprint for building the chat, voice/video calls, and focus sessions in Expo React Native. This document contains every endpoint, socket event, data type, state machine, edge case, and implementation pattern needed to build the full frontend.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Required Packages](#2-required-packages)
3. [Authentication & Connection Setup](#3-authentication--connection-setup)
4. [Socket.IO — Events Reference](#4-socketio--events-reference)
5. [REST API — Conversations](#5-rest-api--conversations)
6. [REST API — Messages](#6-rest-api--messages)
7. [REST API — Calls (Voice & Video)](#7-rest-api--calls-voice--video)
8. [REST API — Focus Sessions](#8-rest-api--focus-sessions)
9. [LiveKit Integration (Video/Voice)](#9-livekit-integration-videovice)
10. [Call Flow — Complete State Machine](#10-call-flow--complete-state-machine)
11. [Focus Session Flow — Complete State Machine](#11-focus-session-flow--complete-state-machine)
12. [Edge Cases & Error Handling](#12-edge-cases--error-handling)
13. [Ringtone & Sound Management](#13-ringtone--sound-management)
14. [Suggested File Structure](#14-suggested-file-structure)
15. [TypeScript Types](#15-typescript-types)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Expo React Native App                         │
├──────────────┬──────────────┬──────────────┬───────────────────────┤
│  REST API    │  Socket.IO   │  LiveKit RN  │  expo-av (sounds)    │
│  (fetch)     │  (real-time) │  (WebRTC)    │  (ringtones)         │
└──────┬───────┴──────┬───────┴──────┬───────┴───────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Backend Server (Express)                          │
│  REST routes ─── Socket.IO server ─── LiveKit token generation      │
│       │              │                        │                     │
│  PostgreSQL      Redis (presence,         LiveKit Cloud             │
│  (messages,      typing, adapter)         (WebRTC SFU)              │
│   calls, focus)                                                     │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**
- REST API for CRUD operations (send message, start call, get history).
- Socket.IO for real-time push events (new message, incoming call, typing).
- LiveKit for actual media transport (audio/video streams).
- The backend handles all call signaling — the frontend never directly signals peers.

**Base URL**: All REST endpoints are prefixed with `/communication/`.

**Auth Header**: All requests require `Authorization: Bearer <jwt_token>`.

---

## 2. Required Packages

```bash
# Core
npx expo install socket.io-client
npx expo install expo-av                    # Ringtones, call sounds
npx expo install expo-keep-awake            # Prevent sleep during calls
npx expo install expo-notifications         # Optional: push for background calls

# LiveKit (requires custom dev build — NOT compatible with Expo Go)
npx expo install @livekit/react-native @livekit/react-native-webrtc
npx expo install expo-dev-client

# State management (recommended)
npx expo install zustand                    # Or use React Context
```

> **CRITICAL**: LiveKit requires native modules. You MUST use `expo-dev-client` and run `npx expo prebuild` before testing calls. LiveKit will NOT work in Expo Go.

---

## 3. Authentication & Connection Setup

### 3.1 HTTP Client Setup

```typescript
// api/client.ts
const BASE_URL = 'https://your-server.com'; // or http://localhost:3000

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, any>,
): Promise<T> {
  const token = await getStoredToken(); // From AsyncStorage / SecureStore
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Request failed');
  return json.data;
}
```

### 3.2 Socket.IO Connection

```typescript
// services/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(BASE_URL, {
    auth: { token },
    transports: ['websocket'],       // Skip polling for RN
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket?.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

  return socket;
}

export function getSocket(): Socket {
  if (!socket) throw new Error('Socket not connected');
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

**When to connect**: Call `connectSocket(token)` immediately after login/app launch with a valid JWT.  
**When to disconnect**: Call `disconnectSocket()` on logout.

---

## 4. Socket.IO — Events Reference

### 4.1 Client → Server Events (Emitting)

| Event | Payload | When to emit |
|-------|---------|-------------|
| `join_conversation` | `conversationId: string` | When user opens a chat screen |
| `leave_conversation` | `conversationId: string` | When user leaves a chat screen |
| `typing` | `{ conversationId, timestamp, eventId }` | When user starts typing (debounce 500ms) |
| `stop_typing` | `{ conversationId, timestamp, eventId }` | When user stops typing (after 2s idle or sends message) |

### 4.2 Server → Client Events (Listening)

#### Messaging Events

| Event | Payload | Action |
|-------|---------|--------|
| `new_message` | `{ conversationId, timestamp, eventId, message: MessageObject }` | Append to message list, update conversation preview |
| `message_edited` | `{ conversationId, timestamp, eventId, message: MessageObject }` | Update the message in place |
| `message_deleted` | `{ conversationId, timestamp, eventId, messageId }` | Mark message as deleted in UI |
| `messages_read` | `{ conversationId, timestamp, eventId, readAt, messageIds[] }` | Update read receipts (blue ticks) |
| `typing` | `{ userId, conversationId, timestamp, eventId }` | Show typing indicator |
| `stop_typing` | `{ userId, conversationId, timestamp, eventId }` | Hide typing indicator |

#### Call Events

| Event | Payload | Action |
|-------|---------|--------|
| `incoming_call` | `{ conversationId, timestamp, eventId, callId, callerId, type: 'VOICE'\|'VIDEO', roomName }` | Show incoming call UI, play ringtone |
| `call_accepted` | `{ conversationId, timestamp, eventId, callId, status: 'ACTIVE' }` | **Caller receives this.** Stop ringing, transition to ACTIVE call UI. The caller is already connected to LiveKit. |
| `call_ended` | `{ conversationId, timestamp, eventId, callId, reason: 'MISSED'\|'CANCELLED'\|'REJECTED'\|'COMPLETED' }` | Stop ringtone, close call UI, show toast |

#### Focus Session Events

| Event | Payload | Action |
|-------|---------|--------|
| `incoming_focus_session` | `{ conversationId, timestamp, eventId, focusId, initiatorId, durationSeconds, roomName }` | Show focus invite UI |
| `focus_accepted` | `{ conversationId, timestamp, eventId, focusId, endsAt, status: 'ACTIVE' }` | **Initiator receives this.** Start timer. The initiator is already connected to LiveKit. |
| `focus_ended` | `{ conversationId, timestamp, eventId, focusId, reason: 'CANCELLED'\|'COMPLETED'\|'REJECTED' }` | Close focus UI |

### 4.3 Event Deduplication

Every socket event includes an `eventId` (UUID). **You MUST deduplicate** by storing a Set of recently processed eventIds (keep last ~200). If you receive a duplicate `eventId`, ignore it. This handles reconnection replay.

```typescript
const processedEvents = new Set<string>();
const MAX_EVENTS = 200;

function isDuplicate(eventId: string): boolean {
  if (processedEvents.has(eventId)) return true;
  processedEvents.add(eventId);
  if (processedEvents.size > MAX_EVENTS) {
    const first = processedEvents.values().next().value;
    processedEvents.delete(first);
  }
  return false;
}
```

---

## 5. REST API — Conversations

### 5.1 `GET /communication/conversations`

**Description**: Get all conversations for the current user (sorted by most recent activity).

**Response**:
```jsonc
{
  "success": true,
  "data": [
    {
      "conversationId": "uuid",
      "match": { "id": "uuid", "status": "accepted" },
      "lastMessage": {
        "id": "uuid",
        "type": "TEXT",              // TEXT | IMAGE | VIDEO | FILE | VOICE_NOTE | SYSTEM
        "text": "Hey! Ready to study?",
        "senderId": "uuid"
      },
      "lastMessageAt": "2026-07-04T02:00:00.000Z",
      "unreadCount": 3,
      "partner": {
        "id": "uuid",
        "fullName": "John Doe",
        "profileImage": "https://..."
      },
      "partnerPresence": "ONLINE",
      "partnerLastSeen": null
    }
  ]
}
```

### 5.2 `GET /communication/conversations/:conversationId`

**Response**:
```jsonc
{
  "success": true,
  "data": {
    "id": "uuid",
    "match_id": "uuid",
    "last_message_id": "uuid",
    "created_at": "2026-07-04T02:00:00.000Z",
    "updated_at": "2026-07-04T02:00:00.000Z"
  }
}
```

---

## 6. REST API — Messages

### 6.1 `GET /communication/conversations/:conversationId/messages?cursor=<base64>`

**Description**: Paginated messages for a conversation (newest first, 30 per page).

**Response**:
```jsonc
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "conversation_id": "uuid",
        "sender_id": "uuid",
        "message_type": "TEXT",
        "message": "Hello!",
        "reply_to_message_id": null,
        "read_at": "2026-07-04T02:01:00.000Z",
        "edited_at": null,
        "deleted_at": null,
        "created_at": "2026-07-04T02:00:00.000Z",
        "updated_at": "2026-07-04T02:00:00.000Z",
        // Only present for media messages:
        "attachment": {
          "url": "https://s3...",
          "filename": "photo.jpg",
          "mimeType": "image/jpeg",
          "extension": "jpg",
          "size": 1024000,
          "durationSeconds": null,
          "thumbnailUrl": null
        }
      }
    ],
    "nextCursor": "eyJjcmVhdGVkQXQiOi...",  // null if no more pages
  }
}
```

**Cursor**: Pass the `nextCursor` value from the previous response as the `cursor` query parameter to get the next page. When `nextCursor` is `null`, you've reached the end.

**Implementation for FlatList**:
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [nextCursor, setNextCursor] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

async function loadMessages(cursor?: string) {
  if (loading) return;
  setLoading(true);
  const path = `/communication/conversations/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ''}`;
  const data = await apiRequest('GET', path);
  setMessages(prev => cursor ? [...prev, ...data.items] : data.items);
  setNextCursor(data.nextCursor);
  setLoading(false);
}

// FlatList: inverted={true}, onEndReached={() => nextCursor && loadMessages(nextCursor)}
```

### 6.2 `POST /communication/conversations/:conversationId/messages`

**Rate Limit**: 10 requests per second.

**Request Body**:
```jsonc
{
  "messageType": "TEXT",              // TEXT | IMAGE | VIDEO | FILE | VOICE_NOTE
  "message": "Hello there!",         // Required for TEXT, optional for others
  "replyToMessageId": "uuid",        // Optional: for reply threading
  "attachment": {                     // Required for IMAGE, VIDEO, FILE, VOICE_NOTE
    "url": "https://s3.../file.jpg", // Pre-uploaded URL from /uploads
    "filename": "photo.jpg",
    "mimeType": "image/jpeg",
    "extension": "jpg",
    "size": 1024000,                  // Bytes
    "durationSeconds": 15,           // For VOICE_NOTE / VIDEO
    "thumbnailUrl": "https://...",   // For VIDEO
    "checksum": "sha256:abc..."      // Optional integrity check
  }
}
```

**Size Limits** (enforced by backend):
| Type | Max Size |
|------|----------|
| IMAGE | 10 MB |
| VIDEO | 50 MB |
| FILE | 50 MB |
| VOICE_NOTE | 10 MB |

**Response**: Returns the saved `MessageObject`.

**Important**: After calling this API, the message will also arrive via the `new_message` socket event. Use **optimistic updates**: show the message immediately in the UI with a "sending" state, then replace it with the real message when the API response or socket event arrives. Deduplicate by `message.id`.

### 6.3 `PATCH /communication/messages/:messageId`

**Request Body**: `{ "message": "Updated text" }`

**Rules**: Only TEXT messages can be edited. Only the sender can edit. Cannot edit deleted messages.

### 6.4 `DELETE /communication/messages/:messageId`

Soft-deletes the message. Sets `message = null`, `deleted_at = NOW()`. The message still appears in the list but should show "This message was deleted" in the UI.

### 6.5 `PATCH /communication/conversations/:conversationId/read`

Marks all unread messages from the partner as read. No request body. Call this when the user opens a conversation or scrolls to unread messages.

### 6.6 `GET /communication/conversations/:conversationId/attachments?cursor=<base64>`

Returns only media messages (IMAGE, VIDEO, FILE, VOICE_NOTE) with attachments. Same pagination format as messages.

---

## 7. REST API — Calls (Voice & Video)

### 7.1 `POST /communication/calls` — Start a Call

**Rate Limit**: 5 per 60 seconds.

**Request Body**:
```jsonc
{
  "conversationId": "uuid",
  "type": "VIDEO"   // "VOICE" | "VIDEO"
}
```

**Response**:
```jsonc
{
  "success": true,
  "data": {
    "id": "call-uuid",
    "conversation_id": "uuid",
    "caller_id": "your-user-id",
    "room_name": "communication_call_xxxx-xxxx",
    "type": "VIDEO",
    "status": "RINGING",
    "started_at": null,
    "ended_at": null,
    "created_at": "2026-07-04T02:00:00.000Z",
    "updated_at": "2026-07-04T02:00:00.000Z",
    "token": "eyJhbGciOiJ...",           // LiveKit JWT for the caller
    "url": "wss://livekit.example.com"    // LiveKit WebSocket URL
  }
}
```

**After calling this**:
1. The partner receives an `incoming_call` socket event.
2. The caller should navigate to the **Outgoing Call Screen**, play the ringing sound, and optionally connect to LiveKit to show a camera preview.
3. Wait for the `call_accepted` socket event to transition the UI to the active call state. (The caller connects to LiveKit immediately using the token from this response).

### 7.2 `PATCH /communication/calls/:callId/accept` — Accept a Call

**Response**:
```jsonc
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJ...",            // LiveKit JWT for the callee
    "url": "wss://livekit.example.com",
    "roomName": "communication_call_xxxx"
  }
}
```

**After calling this**:
1. The caller receives a `call_accepted` socket event (which contains a fresh token, but the caller doesn't need to reconnect if they already joined the room).
2. Both users connect to LiveKit with their respective tokens.
3. Navigate to the **Active Call Screen**.

### 7.3 `PATCH /communication/calls/:callId/reject` — Reject a Call

Same response as `endCall`. The ended reason will be `REJECTED`.

### 7.4 `PATCH /communication/calls/:callId/end` — End a Call

**Response**: Returns the updated call session object.

The ended `reason` is determined by the backend:
| Who | Call Status | Reason |
|-----|------------|--------|
| Caller ends | RINGING | `CANCELLED` |
| Callee ends | RINGING | `REJECTED` |
| Either ends | ACTIVE | `COMPLETED` |
| Server timeout | RINGING > 60s | `MISSED` |

Both users receive a `call_ended` socket event.

### 7.5 `GET /communication/conversations/:conversationId/calls?cursor=<base64>` — Call History

**Response**:
```jsonc
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "conversation_id": "uuid",
        "caller_id": "uuid",
        "room_name": "communication_call_xxxx",
        "type": "VIDEO",
        "status": "ENDED",
        "ended_reason": "COMPLETED",
        "started_at": "2026-07-04T02:01:00.000Z",
        "ended_at": "2026-07-04T02:15:00.000Z",
        "created_at": "2026-07-04T02:00:00.000Z",
        "updated_at": "2026-07-04T02:15:00.000Z"
      }
    ],
    "nextCursor": null
  }
}
```

---

## 8. REST API — Focus Sessions

Focus sessions are timed co-study sessions with a LiveKit room (for screen sharing or co-presence).

### 8.1 `POST /communication/focus` — Start Focus

**Rate Limit**: 5 per 60 seconds.

**Request Body**:
```jsonc
{
  "conversationId": "uuid",
  "durationSeconds": 1800    // 30 minutes. Positive integer.
}
```

**Response**:
```jsonc
{
  "success": true,
  "data": {
    "id": "focus-uuid",
    "conversation_id": "uuid",
    "initiator_id": "your-user-id",
    "room_name": "communication_focus_xxxx",
    "duration_seconds": 1800,
    "status": "PENDING",
    "started_at": null,
    "ends_at": null,
    "created_at": "2026-07-04T02:00:00.000Z",
    "updated_at": "2026-07-04T02:00:00.000Z",
    "token": "eyJhbGciOiJ...",
    "url": "wss://livekit.example.com"
  }
}
```

### 8.2 `PATCH /communication/focus/:focusId/accept`

**Response**:
```jsonc
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJ...",
    "url": "wss://livekit.example.com",
    "roomName": "communication_focus_xxxx",
    "endsAt": "2026-07-04T02:30:00.000Z"
  }
}
```

**After accepting**: The initiator receives a `focus_accepted` socket event with their token and `endsAt` timestamp. The joiner connects to LiveKit (the initiator should have connected immediately upon creation). Both start the countdown timer.

### 8.3 `PATCH /communication/focus/:focusId/reject`
### 8.4 `PATCH /communication/focus/:focusId/end`

Same behavior. Returns the updated focus session.

### 8.5 `GET /communication/conversations/:conversationId/focus?cursor=<base64>` — Focus History

Same pagination format as calls.

---

## 9. LiveKit Integration (Video/Voice)

### 9.1 Setup

```typescript
// App.tsx or root layout
import { registerGlobals } from '@livekit/react-native';

// Call this ONCE at app startup, before any LiveKit usage
registerGlobals();
```

### 9.2 Connecting to a Room

```tsx
import {
  LiveKitRoom,
  VideoTrack,
  AudioSession,
  useTracks,
  useParticipants,
  isTrackReference,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

function CallScreen({ token, url, roomName, callType }: CallScreenProps) {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      audio={true}
      video={callType === 'VIDEO'}
    >
      <CallLayout callType={callType} />
    </LiveKitRoom>
  );
}

function CallLayout({ callType }: { callType: 'VOICE' | 'VIDEO' }) {
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  const participants = useParticipants();

  // For video calls, render camera tracks
  // For voice calls, render avatar + audio visualizer

  return (
    <View style={{ flex: 1 }}>
      {callType === 'VIDEO' && tracks
        .filter(isTrackReference)
        .filter(t => t.source === Track.Source.Camera)
        .map(track => (
          <VideoTrack
            key={track.participant.sid}
            trackRef={track}
            style={{ flex: 1 }}
          />
        ))
      }
    </View>
  );
}
```

### 9.3 Audio Session Management (iOS)

```typescript
import { AudioSession } from '@livekit/react-native';

// Before connecting to a call
await AudioSession.startAudioSession();

// After disconnecting from a call
await AudioSession.stopAudioSession();
```

### 9.4 Mute/Unmute Controls

```typescript
import { useLocalParticipant } from '@livekit/react-native';

function CallControls() {
  const { localParticipant } = useLocalParticipant();

  const toggleMic = () => {
    localParticipant?.setMicrophoneEnabled(
      !localParticipant.isMicrophoneEnabled
    );
  };

  const toggleCamera = () => {
    localParticipant?.setCameraEnabled(
      !localParticipant.isCameraEnabled
    );
  };

  const flipCamera = async () => {
    // Switch front/back camera
    const videoTrack = localParticipant?.getTrackPublication(Track.Source.Camera);
    if (videoTrack?.track) {
      await (videoTrack.track as any).restartTrack({ facingMode: 'environment' });
    }
  };

  return (/* UI buttons */);
}
```

---

## 10. Call Flow — Complete State Machine

```
                    ┌─────────────────────────────────────┐
                    │           CALLER (User A)            │
                    └──────────────┬──────────────────────┘
                                   │
                    POST /calls { conversationId, type }
                                   │
                    ┌──────────────▼──────────────────────┐
                    │   Response: { callId, token, url }   │
                    │   → Navigate to OutgoingCallScreen   │
                    │   → Play ringing sound               │
                    │   → Connect to LiveKit immediately   │
                    │     with token for camera preview    │
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
    call_accepted              call_ended               60s timeout
    socket event               socket event             (server auto)
         │                    reason=REJECTED            reason=MISSED
         │                    or CANCELLED                   │
         ▼                         │                         │
    ┌──────────────┐               ▼                         ▼
    │ Transition   │         ┌──────────┐             ┌──────────┐
    │ to ACTIVE    │         │ Show     │             │ Show     │
    │ Stop ringing │         │ "Call    │             │ "No      │
    │ (Already     │         │ Ended"   │             │ Answer"  │
    │  connected)  │         │ toast    │             │ toast    │
    └──────┬───────┘         └──────────┘             └──────────┘
           │
    Either user: PATCH /calls/:callId/end
           │
    call_ended socket event (reason=COMPLETED)
           │
    ┌──────▼───────┐
    │ Disconnect   │
    │ LiveKit      │
    │ Stop sounds  │
    │ Navigate     │
    │ back to chat │
    └──────────────┘
```

```
                    ┌─────────────────────────────────────┐
                    │           CALLEE (User B)            │
                    └──────────────┬──────────────────────┘
                                   │
                    incoming_call socket event
                    { callId, callerId, type, roomName }
                                   │
                    ┌──────────────▼──────────────────────┐
                    │   → Navigate to IncomingCallScreen   │
                    │   → Play ringtone                    │
                    │   → Show caller info                 │
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
    User taps Accept          User taps Reject          call_ended
    PATCH /calls/:id/accept   PATCH /calls/:id/reject   socket event
         │                         │                    reason=CANCELLED
         ▼                         ▼                    or MISSED
    ┌──────────────┐         ┌──────────┐                    │
    │ Response:    │         │ Navigate │                    ▼
    │ { token,     │         │ back     │              ┌──────────┐
    │   url,       │         └──────────┘              │ Stop     │
    │   roomName } │                                   │ ringtone │
    │              │                                   │ Navigate │
    │ Connect to   │                                   │ back     │
    │ LiveKit room │                                   └──────────┘
    │ → Active     │
    │   Call UI    │
    └──────────────┘
```

### Caller Implementation Pseudocode

```typescript
async function startCall(conversationId: string, type: 'VOICE' | 'VIDEO') {
  // 1. API call
  const call = await api.post('/communication/calls', { conversationId, type });
  
  // 2. Store call state
  setActiveCall({
    callId: call.id,
    type: call.type,
    role: 'caller',
    status: 'ringing',
    token: call.token,
    url: call.url,
    roomName: call.room_name,
  });

  // 3. Play ringing sound
  await playSound('outgoing_ring', { loop: true });

  // 4. Navigate to outgoing call screen and connect to LiveKit
  navigation.navigate('OutgoingCall', { token: call.token, url: call.url });

  // 5. Start a 60-second timeout (server also does this, but for UX)
  callTimeout = setTimeout(() => {
    if (activeCall?.status === 'ringing') {
      endCall(call.id);
    }
  }, 60000);
}

// Socket listener — set up ONCE at app level
socket.on('call_accepted', (payload) => {
  stopSound('outgoing_ring');
  clearTimeout(callTimeout);

  setActiveCall(prev => ({
    ...prev!,
    status: 'active',
  }));

  // You are already connected to LiveKit. The call is now active.
});

socket.on('call_ended', (payload) => {
  stopAllSounds();
  clearTimeout(callTimeout);
  setActiveCall(null);

  // Show appropriate toast based on payload.reason
  if (payload.reason === 'REJECTED') showToast('Call was declined');
  if (payload.reason === 'MISSED') showToast('No answer');
  if (payload.reason === 'CANCELLED') showToast('Call cancelled');
  if (payload.reason === 'COMPLETED') showToast('Call ended');

  navigation.goBack();
});
```

### Callee Implementation Pseudocode

```typescript
// Socket listener — set up ONCE at app level
socket.on('incoming_call', async (payload) => {
  // Check if already in a call
  if (activeCall) return; // Ignore, already busy

  setIncomingCall({
    callId: payload.callId,
    callerId: payload.callerId,
    type: payload.type,
    conversationId: payload.conversationId,
    roomName: payload.roomName,
  });

  await playSound('incoming_ring', { loop: true });
  navigation.navigate('IncomingCall');
});

async function acceptCall(callId: string) {
  stopSound('incoming_ring');

  const creds = await api.patch(`/communication/calls/${callId}/accept`);

  setActiveCall({
    callId,
    type: incomingCall!.type,
    role: 'callee',
    status: 'active',
    token: creds.token,
    url: creds.url,
    roomName: creds.roomName,
  });

  setIncomingCall(null);
  navigation.navigate('ActiveCall');
}

async function rejectCall(callId: string) {
  stopSound('incoming_ring');
  await api.patch(`/communication/calls/${callId}/reject`);
  setIncomingCall(null);
  navigation.goBack();
}
```

---

## 11. Focus Session Flow — Complete State Machine

Same pattern as calls but with a timer:

```
PENDING ──(partner accepts)──► ACTIVE ──(timer expires OR user ends)──► COMPLETED
   │                                         │
   │──(partner rejects / 60s timeout)──► CANCELLED
```

**Key Difference from Calls**: Focus sessions have a `durationSeconds` and `endsAt` timestamp. When ACTIVE, show a countdown timer. The server auto-completes the session when `endsAt <= NOW()` via the cron scheduler.

```typescript
// Focus timer implementation
function FocusTimer({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return <Text>{`${minutes}:${seconds.toString().padStart(2, '0')}`}</Text>;
}
```

---

## 12. Edge Cases & Error Handling

### 12.1 Network & Reconnection

| Scenario | Handling |
|----------|---------|
| Socket disconnects during call | LiveKit handles its own reconnection. Socket.IO auto-reconnects. On reconnect, check `activeCall` state and verify with API. |
| App goes to background during call | Use `expo-keep-awake` to prevent sleep. LiveKit continues in background on iOS/Android. |
| App killed during call | Server cron marks RINGING calls as MISSED after 60s. ACTIVE calls persist until the other party ends. |
| Double-tap on call button | Disable button after first tap. Backend returns `400 "Already an active call"` if duplicate. |
| Both users call each other simultaneously | Backend's `unique_active_call` index prevents two active calls. Second call gets `400`. |

### 12.2 Call-Specific Edge Cases

| Scenario | Handling |
|----------|---------|
| Callee receives `incoming_call` but call was already cancelled | When opening IncomingCallScreen, the callee accepts → backend returns `400 "Cannot accept call. Status is CANCELLED"`. Handle this error and navigate back. |
| Callee receives `call_ended` while on IncomingCallScreen | Stop ringtone, dismiss screen, show "Missed call" or "Call cancelled" toast. |
| Caller receives `call_ended` with reason `MISSED` | This comes from the server 60s cron. Stop ringing, show "No answer". |
| User tries to accept a call that was already accepted (idempotent) | Backend returns the same token without re-emitting `call_accepted` to the caller. Safe. |
| LiveKit room disconnect while call is ACTIVE | Show "Reconnecting..." overlay. LiveKit auto-reconnects. If it fails after N attempts, call `endCall` via API. |

### 12.3 Message Edge Cases

| Scenario | Handling |
|----------|---------|
| Send message fails (network) | Show retry button on the failed message. Keep message in local state with `status: 'failed'`. |
| Receive `new_message` for a message you just sent | Deduplicate by `message.id`. Replace optimistic message with server-confirmed message. |
| Receive `new_message` for a conversation not currently open | Update the conversation list preview, increment unread count. Do NOT try to join the conversation room. |
| User opens app after being offline | Fetch conversations list (GET /conversations) to sync unread counts. When opening a chat, messages are fetched fresh via the paginated API. |

### 12.4 Focus Session Edge Cases

| Scenario | Handling |
|----------|---------|
| Focus timer reaches 0 | Server auto-completes via cron. Client receives `focus_ended` with reason `COMPLETED`. Show congratulations UI. |
| User leaves focus early | PATCH `/focus/:id/end`. Both users receive `focus_ended`. |
| Focus invite times out (60s) | Server cancels via cron. Both users receive `focus_ended` with reason `CANCELLED`. |

### 12.5 Error Response Format

All API errors return:
```jsonc
{
  "success": false,
  "message": "Human-readable error message",
  "statusCode": 400
}
```

Common status codes:
| Code | Meaning |
|------|---------|
| 400 | Validation error or invalid state transition |
| 401 | Missing or invalid JWT token |
| 403 | Not a participant in this conversation, or match not accepted |
| 404 | Conversation/message/call not found |
| 429 | Rate limit exceeded |
| 501 | LiveKit not configured on the server |

---

## 13. Ringtone & Sound Management

### 13.1 Sound Files Needed

| Sound | File | Usage |
|-------|------|-------|
| Incoming call ringtone | `incoming_ring.mp3` | Loops while IncomingCallScreen is shown |
| Outgoing call ringing | `outgoing_ring.mp3` | Loops while caller is waiting for answer |
| Call connected | `call_connected.mp3` | Single play when call transitions to ACTIVE |
| Call ended | `call_ended.mp3` | Single play when call ends |
| Message sent | `message_sent.mp3` | Short blip on send |
| Message received | `message_received.mp3` | Short blip on receive |
| Focus invite | `focus_invite.mp3` | Notification sound for incoming focus |

### 13.2 Implementation with `expo-av`

```typescript
import { Audio } from 'expo-av';

const sounds: Record<string, Audio.Sound | null> = {};

export async function playSound(name: string, options?: { loop?: boolean }) {
  // Stop existing instance of this sound
  await stopSound(name);

  const soundFiles: Record<string, any> = {
    incoming_ring: require('../assets/sounds/incoming_ring.mp3'),
    outgoing_ring: require('../assets/sounds/outgoing_ring.mp3'),
    call_connected: require('../assets/sounds/call_connected.mp3'),
    call_ended: require('../assets/sounds/call_ended.mp3'),
    message_sent: require('../assets/sounds/message_sent.mp3'),
    message_received: require('../assets/sounds/message_received.mp3'),
    focus_invite: require('../assets/sounds/focus_invite.mp3'),
  };

  const { sound } = await Audio.Sound.createAsync(soundFiles[name]!, {
    isLooping: options?.loop ?? false,
    shouldPlay: true,
  });

  sounds[name] = sound;
}

export async function stopSound(name: string) {
  if (sounds[name]) {
    await sounds[name]!.stopAsync();
    await sounds[name]!.unloadAsync();
    sounds[name] = null;
  }
}

export async function stopAllSounds() {
  for (const name of Object.keys(sounds)) {
    await stopSound(name);
  }
}
```

### 13.3 Audio Mode Configuration

```typescript
// Set audio mode for calls (speaker, mixing, etc.)
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,      // CRITICAL: rings even in silent mode
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false, // Use speaker for ringtone
});

// When in an active call, switch to earpiece:
await Audio.setAudioModeAsync({
  playThroughEarpieceAndroid: true,
  allowsRecordingIOS: true,         // For microphone access
});
```

---

## 14. Suggested File Structure

```
src/
├── features/
│   └── communication/
│       ├── api/
│       │   ├── communicationApi.ts        # All REST API calls
│       │   └── types.ts                    # TypeScript interfaces
│       ├── hooks/
│       │   ├── useSocket.ts               # Socket connection hook
│       │   ├── useMessages.ts             # Messages with pagination
│       │   ├── useTypingIndicator.ts       # Typing state
│       │   ├── useCallManager.ts          # Full call lifecycle
│       │   └── useFocusManager.ts         # Full focus lifecycle
│       ├── screens/
│       │   ├── ConversationsListScreen.tsx
│       │   ├── ChatScreen.tsx
│       │   ├── IncomingCallScreen.tsx
│       │   ├── OutgoingCallScreen.tsx
│       │   ├── ActiveCallScreen.tsx
│       │   ├── IncomingFocusScreen.tsx
│       │   └── ActiveFocusScreen.tsx
│       ├── components/
│       │   ├── MessageBubble.tsx
│       │   ├── MessageInput.tsx
│       │   ├── TypingIndicator.tsx
│       │   ├── CallControls.tsx
│       │   ├── VideoGrid.tsx
│       │   ├── FocusTimer.tsx
│       │   └── AttachmentPicker.tsx
│       ├── store/
│       │   └── communicationStore.ts       # Zustand store
│       └── utils/
│           ├── sounds.ts                   # Sound manager
│           ├── eventDedup.ts              # Event deduplication
│           └── cursor.ts                   # Cursor helpers
├── services/
│   └── socket.ts                           # Socket.IO singleton
└── assets/
    └── sounds/
        ├── incoming_ring.mp3
        ├── outgoing_ring.mp3
        ├── call_connected.mp3
        ├── call_ended.mp3
        ├── message_sent.mp3
        ├── message_received.mp3
        └── focus_invite.mp3
```

---

## 15. TypeScript Types

```typescript
// ============ ENUMS ============

type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE_NOTE' | 'SYSTEM';
type CallType = 'VOICE' | 'VIDEO';
type CallStatus = 'RINGING' | 'ACTIVE' | 'ENDED';
type CallEndedReason = 'REJECTED' | 'MISSED' | 'CANCELLED' | 'COMPLETED';
type FocusStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

// ============ DATA MODELS ============

interface Attachment {
  url: string;
  filename: string;
  mimeType: string;
  extension: string;
  size: number;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  message: string | null;
  reply_to_message_id: string | null;
  read_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  attachment?: Attachment;
}

interface ConversationPreview {
  conversationId: string;
  match: { id: string; status: string };
  lastMessage: {
    id: string | null;
    type: MessageType | null;
    text: string | null;
    senderId: string | null;
  };
  lastMessageAt: string | null;
  unreadCount: number;
  partner: {
    id: string;
    fullName: string;
    profileImage: string | null;
  };
  partnerPresence: 'ONLINE' | 'OFFLINE' | 'IN_CALL' | 'IN_FOCUS';
  partnerLastSeen: string | null;
}

interface CallSession {
  id: string;
  conversation_id: string;
  caller_id: string;
  room_name: string;
  type: CallType;
  status: CallStatus;
  ended_reason: CallEndedReason | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CallStartResponse extends CallSession {
  token: string;
  url: string;
}

interface CallAcceptResponse {
  token: string;
  url: string;
  roomName: string;
}

interface FocusSession {
  id: string;
  conversation_id: string;
  initiator_id: string;
  room_name: string;
  duration_seconds: number;
  status: FocusStatus;
  started_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FocusStartResponse extends FocusSession {
  token: string;
  url: string;
}

interface FocusAcceptResponse {
  token: string;
  url: string;
  roomName: string;
  endsAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// ============ SOCKET EVENT PAYLOADS ============

interface NewMessageEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  message: Message;
}

interface MessageEditedEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  message: Message;
}

interface MessageDeletedEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  messageId: string;
}

interface MessagesReadEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  readAt: string;
  messageIds: string[];
}

interface TypingEvent {
  userId: string;
  conversationId: string;
  timestamp: number;
  eventId: string;
}

interface IncomingCallEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  callId: string;
  callerId: string;
  type: CallType;
  roomName: string;
}

interface CallAcceptedEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  callId: string;
  status: 'ACTIVE';
}

interface CallEndedEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  callId: string;
  reason: CallEndedReason;
}

interface IncomingFocusEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  focusId: string;
  initiatorId: string;
  durationSeconds: number;
  roomName: string;
}

interface FocusAcceptedEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  focusId: string;
  endsAt: string;
  status: 'ACTIVE';
}

interface FocusEndedEvent {
  conversationId: string;
  timestamp: number;
  eventId: string;
  focusId: string;
  reason: 'CANCELLED' | 'COMPLETED' | 'REJECTED';
}

// ============ LOCAL STATE ============

interface ActiveCallState {
  callId: string;
  type: CallType;
  role: 'caller' | 'callee';
  status: 'ringing' | 'active';
  token: string;
  url: string;
  roomName: string;
  conversationId: string;
  partnerName?: string;
  partnerImage?: string;
}

interface IncomingCallState {
  callId: string;
  callerId: string;
  type: CallType;
  conversationId: string;
  roomName: string;
  callerName?: string;     // Look up from conversation list cache
  callerImage?: string;
}

interface ActiveFocusState {
  focusId: string;
  role: 'initiator' | 'joiner';
  status: 'pending' | 'active';
  token: string;
  url: string;
  roomName: string;
  conversationId: string;
  durationSeconds: number;
  endsAt?: string;
}
```

---

## Quick Reference — All Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/communication/conversations` | List all conversations |
| GET | `/communication/conversations/:id` | Get single conversation |
| GET | `/communication/conversations/:id/messages?cursor=` | Get paginated messages |
| POST | `/communication/conversations/:id/messages` | Send a message |
| PATCH | `/communication/conversations/:id/read` | Mark messages as read |
| GET | `/communication/conversations/:id/attachments?cursor=` | Get media messages |
| PATCH | `/communication/messages/:id` | Edit a message |
| DELETE | `/communication/messages/:id` | Delete a message |
| POST | `/communication/calls` | Start a call |
| PATCH | `/communication/calls/:id/accept` | Accept a call |
| PATCH | `/communication/calls/:id/reject` | Reject a call |
| PATCH | `/communication/calls/:id/end` | End a call |
| GET | `/communication/conversations/:id/calls?cursor=` | Call history |
| POST | `/communication/focus` | Start focus session |
| PATCH | `/communication/focus/:id/accept` | Accept focus |
| PATCH | `/communication/focus/:id/reject` | Reject focus |
| PATCH | `/communication/focus/:id/end` | End focus |
| GET | `/communication/conversations/:id/focus?cursor=` | Focus history |

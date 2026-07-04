import { registry } from "@/config/openapi";
import { z } from "zod";
import { 
  sendMessageSchema, 
  updateMessageSchema, 
  startCallSchema, 
  startFocusSchema,
  messageTypeEnum,
  callTypeEnum,
  callStatusEnum,
  callEndedReasonEnum,
  focusStatusEnum
} from "./communication.schema";

// Response schemas
const messageResponseSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  sender_id: z.string().uuid(),
  message_type: messageTypeEnum,
  message: z.string().nullable(),
  reply_to_message_id: z.string().uuid().nullable(),
  read_at: z.string().datetime().nullable(),
  edited_at: z.string().datetime().nullable(),
  deleted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  attachment: z.object({
    url: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    extension: z.string(),
    size: z.number(),
    durationSeconds: z.number().nullable(),
    thumbnailUrl: z.string().nullable(),
  }).optional()
});

const conversationResponseSchema = z.object({
  conversationId: z.string().uuid(),
  matchId: z.string().uuid(),
  matchStatus: z.string(),
  lastMessageId: z.string().uuid().nullable(),
  lastMessageType: messageTypeEnum.nullable(),
  lastMessageText: z.string().nullable(),
  lastMessageAt: z.string().datetime().nullable(),
  lastMessageSenderId: z.string().uuid().nullable(),
  unreadCount: z.string(),
  partnerId: z.string().uuid(),
  partnerName: z.string(),
  partnerImage: z.string().url().nullable()
});

registry.registerPath({
  method: "get",
  path: "/api/communication/conversations",
  summary: "Get conversations",
  description: "Get a list of all active conversations for the current user",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "List of conversations",
      content: {
        "application/json": {
          schema: z.array(conversationResponseSchema),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/communication/conversations/{conversationId}",
  summary: "Get conversation by ID",
  description: "Get details for a specific conversation",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      conversationId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Conversation details",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().uuid(),
            match_id: z.string().uuid(),
            last_message_id: z.string().uuid().nullable(),
            created_at: z.string().datetime(),
            updated_at: z.string().datetime(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/communication/conversations/{conversationId}/messages",
  summary: "Get messages",
  description: "Get paginated messages for a conversation",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      conversationId: z.string().uuid(),
    }),
    query: z.object({
      cursor: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Paginated list of messages",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(messageResponseSchema),
            nextCursor: z.string().nullable(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/communication/conversations/{conversationId}/messages",
  summary: "Send a message",
  description: "Send a text or media message in a conversation",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      conversationId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: sendMessageSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Message sent successfully",
      content: {
        "application/json": {
          schema: messageResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/communication/messages/{messageId}",
  summary: "Edit a message",
  description: "Edit a previously sent text message",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      messageId: z.string().uuid(),
    }),
    body: {
      content: {
        "application/json": {
          schema: updateMessageSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Message updated successfully",
      content: {
        "application/json": {
          schema: messageResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/communication/messages/{messageId}",
  summary: "Delete a message",
  description: "Delete a previously sent message",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      messageId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Message deleted successfully",
      content: {
        "application/json": {
          schema: messageResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/communication/calls",
  summary: "Start a call",
  description: "Initiate a voice or video call",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: startCallSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Call initiated successfully",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().uuid(),
            conversation_id: z.string().uuid(),
            caller_id: z.string().uuid(),
            room_name: z.string(),
            type: callTypeEnum,
            status: callStatusEnum,
            started_at: z.string().datetime(),
            created_at: z.string().datetime(),
            token: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/communication/calls/{callId}/accept",
  summary: "Accept a call",
  description: "Accept an incoming call",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      callId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Call accepted",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().uuid(),
            status: callStatusEnum,
            token: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/communication/calls/{callId}/end",
  summary: "End a call",
  description: "End an active call",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      callId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Call ended successfully",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().uuid(),
            status: callStatusEnum,
            ended_reason: callEndedReasonEnum.nullable(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/communication/focus",
  summary: "Start a focus session",
  description: "Initiate a synchronized focus session with a partner",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: startFocusSchema.shape.body,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Focus session initiated",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().uuid(),
            conversation_id: z.string().uuid(),
            initiator_id: z.string().uuid(),
            room_name: z.string(),
            duration_seconds: z.number().int(),
            status: focusStatusEnum,
            token: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/communication/focus/{focusId}/accept",
  summary: "Accept a focus session",
  description: "Accept an incoming focus session request",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      focusId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Focus session accepted",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().uuid(),
            status: focusStatusEnum,
            started_at: z.string().datetime(),
            ends_at: z.string().datetime(),
            token: z.string(),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/communication/focus/{focusId}/end",
  summary: "End a focus session",
  description: "End an active focus session early",
  tags: ["Communication"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      focusId: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      description: "Focus session ended",
      content: {
        "application/json": {
          schema: z.object({
            id: z.string().uuid(),
            status: focusStatusEnum,
          }),
        },
      },
    },
  },
});

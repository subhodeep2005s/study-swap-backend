import { z } from "zod";

export const messageTypeEnum = z.enum(['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'VOICE_NOTE', 'SYSTEM']);
export const callTypeEnum = z.enum(['VOICE', 'VIDEO']);
export const callStatusEnum = z.enum(['RINGING', 'ACTIVE', 'ENDED']);
export const callEndedReasonEnum = z.enum(['REJECTED', 'MISSED', 'CANCELLED', 'COMPLETED']);
export const focusStatusEnum = z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']);

export const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime({ offset: true }).or(z.string()),
  id: z.string().uuid(),
});

export const sendMessageSchema = z.object({
  params: z.object({
    conversationId: z.string().uuid(),
  }),
  body: z.object({
    messageType: messageTypeEnum,
    message: z.string().optional(),
    replyToMessageId: z.string().uuid().optional(),
    attachment: z.object({
      url: z.string().url(),
      filename: z.string(),
      mimeType: z.string(),
      extension: z.string(),
      size: z.number().int().positive(),
      durationSeconds: z.number().int().positive().optional(),
      thumbnailUrl: z.string().url().optional(),
      checksum: z.string().optional(),
    }).optional(),
  }).refine((data) => {
    if (data.messageType === 'TEXT' && (!data.message || data.message.trim() === '')) {
      return false; // Text messages must have content
    }
    if (data.messageType !== 'TEXT' && data.messageType !== 'SYSTEM' && !data.attachment) {
      return false; // Media messages must have an attachment
    }
    
    // File validation logic
    if (data.attachment) {
      const { mimeType, size } = data.attachment;
      if (data.messageType === 'IMAGE') {
        if (!mimeType.startsWith('image/')) return false;
        if (size > 10 * 1024 * 1024) return false; // 10MB
      }
      if (data.messageType === 'VIDEO') {
        if (!mimeType.startsWith('video/')) return false;
        if (size > 50 * 1024 * 1024) return false; // 50MB
      }
      if (data.messageType === 'FILE') {
        if (size > 50 * 1024 * 1024) return false; // 50MB max file
      }
      if (data.messageType === 'VOICE_NOTE') {
        if (!mimeType.startsWith('audio/')) return false;
        if (size > 10 * 1024 * 1024) return false; // 10MB
      }
    }

    return true;
  }, {
    message: "Invalid message payload. Text messages require content. Attachments must match type and size limits (Images/Audio 10MB, Video/Files 50MB).",
    path: ["body"],
  }),
});

export const updateMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1),
  })
});

export const startCallSchema = z.object({
  body: z.object({
    conversationId: z.string().uuid(),
    type: callTypeEnum,
  }),
});

export const startFocusSchema = z.object({
  body: z.object({
    conversationId: z.string().uuid(),
    durationSeconds: z.number().int().positive(),
  }),
});

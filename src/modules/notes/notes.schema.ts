import { z } from "zod";

export const noteTypeEnum = z.enum([
  'LECTURE_NOTES',
  'REVISION_NOTES',
  'SHORT_NOTES',
  'FORMULA_SHEET',
  'CHEAT_SHEET',
  'PYQ',
  'QUESTION_PAPER',
  'MOCK_TEST',
  'SOLUTION',
  'STUDY_GUIDE',
  'FLASHCARDS',
  'OTHER'
]);

export const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime({ offset: true }).or(z.string()),
  id: z.string().uuid(),
});

const uploadNoteBody = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  noteType: noteTypeEnum,

  // Taxonomy References
  countryId: z.string().uuid().optional(),
  educationNodeIds: z.array(z.string().uuid()).min(1),

  // File Details
  fileKey: z.string().min(1),
  mimeType: z.literal("application/pdf"),
  fileSize: z.number().int().positive(),
  pageCount: z.number().int().positive().optional(),
  fileHash: z.string().min(1),
});

export const uploadNoteBodySchema = z.object({ body: uploadNoteBody });

export const updateNoteBodySchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    noteType: noteTypeEnum.optional(),
    countryId: z.string().uuid().optional(),
    educationNodeIds: z.array(z.string().uuid()).optional(),
  })
});

export const presignedUrlBodySchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    contentType: z.literal("application/pdf"),
  })
});

export type PresignedUrlBody = z.infer<typeof presignedUrlBodySchema>["body"];
export type UploadNoteBody = z.infer<typeof uploadNoteBodySchema>["body"];

export const rateNoteBodySchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
  })
});

export const reportNoteBodySchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  })
});

export const getNotesQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    q: z.string().optional(),
    countryId: z.string().uuid().optional(),
    educationNodeId: z.string().uuid().optional(),
    noteType: noteTypeEnum.optional(),
    uploaderRole: z.enum(['student', 'mentor', 'admin']).optional(),
    sort: z.enum(['recommended', 'newest', 'most_viewed', 'most_downloaded', 'highest_rated']).default('newest'),
  })
});

export const getMyNotesQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    filter: z.enum(['all', 'published', 'deleted']).default('all'),
  })
});

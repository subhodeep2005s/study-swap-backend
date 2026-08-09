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
  educationNodeId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  examId: z.string().uuid().optional(),
  boardId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),

  // File Details
  fileKey: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  pageCount: z.number().int().positive().optional(),
  fileHash: z.string().min(1),
}).refine(data => {
  // At least one taxonomy node must be provided
  return !!(
    data.countryId ||
    data.educationNodeId ||
    data.categoryId ||
    data.subcategoryId ||
    data.examId ||
    data.boardId ||
    data.classId ||
    data.courseId ||
    data.subjectId
  );
}, {
  message: "Academic classification is required. Please select the appropriate exam, board, class, or course.",
  path: ["countryId"]
});

export const uploadNoteBodySchema = z.object({ body: uploadNoteBody });

export const updateNoteBodySchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    noteType: noteTypeEnum.optional(),
    countryId: z.string().uuid().optional(),
    educationNodeId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    subcategoryId: z.string().uuid().optional(),
    examId: z.string().uuid().optional(),
    boardId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
  })
});

export const presignedUrlBodySchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    contentType: z.string().min(1),
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
    categoryId: z.string().uuid().optional(),
    subcategoryId: z.string().uuid().optional(),
    examId: z.string().uuid().optional(),
    boardId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
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

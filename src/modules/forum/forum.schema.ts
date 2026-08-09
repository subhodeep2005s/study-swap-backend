import { z } from "zod";

export const generateProfileSchema = z.object({
  body: z.object({
    // Empty for now, as backend generates name and defaults,
    // but we might want to accept an initial avatar optionally
    avatarKey: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});
export type GenerateProfileBody = z.infer<typeof generateProfileSchema>["body"];

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(3).max(50).optional(),
    avatarKey: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>["body"];

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    content: z.string().min(10).max(10000),
    categoryId: z.string().uuid(),
    type: z.enum(["STORY", "QUESTION", "RANT", "ADVICE", "DISCUSSION", "POLL"]),
    media: z.array(z.object({
      objectKey: z.string(),
      url: z.string().url(),
      mimeType: z.string(),
      size: z.number(),
      type: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
    })).max(4).optional(),
    poll: z.object({
      expiresInHours: z.number().min(1).max(168).optional(), // Max 1 week
      options: z.array(z.string().min(1).max(100)).min(2).max(10),
    }).optional()
  }).refine((data) => {
    if (data.type === "POLL" && !data.poll) return false;
    return true;
  }, "Poll options are required if type is POLL")
});
export type CreatePostBody = z.infer<typeof createPostSchema>["body"];

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(2000),
    parentCommentId: z.string().uuid().optional(),
  }),
});
export type CreateCommentBody = z.infer<typeof createCommentSchema>["body"];

export const reportSchema = z.object({
  body: z.object({
    targetType: z.enum(["POST", "COMMENT", "PROFILE"]),
    targetId: z.string().uuid(),
    reason: z.enum([
      "SPAM", "HARASSMENT", "BULLYING", "HATE", "SEXUAL_CONTENT", 
      "SELF_HARM", "VIOLENCE", "SCAM", "MISINFORMATION", "OTHER"
    ]),
    details: z.string().max(500).optional(),
  }),
});
export type ReportBody = z.infer<typeof reportSchema>["body"];

export const votePollSchema = z.object({
  body: z.object({
    optionId: z.string().uuid(),
  }),
});
export type VotePollBody = z.infer<typeof votePollSchema>["body"];

export const blockProfileSchema = z.object({
  body: z.object({
    profileId: z.string().uuid(),
  }),
});
export type BlockProfileBody = z.infer<typeof blockProfileSchema>["body"];

import { z } from "zod";
import { 
  HallOfFameAchievementType, 
  HallOfFameMediaType, 
  HallOfFameStatus 
} from "./hall-of-fame.types";

const achievementTypeEnum = z.enum([
  'EXAM_CLEARED',
  'SCORE_IMPROVEMENT',
  'COLLEGE_ADMISSION',
  'JOB_PLACEMENT',
  'RANK_ACHIEVEMENT',
  'ACADEMIC_ACHIEVEMENT',
  'COMPETITION_ACHIEVEMENT',
  'CERTIFICATION',
  'SCHOLARSHIP',
  'COMEBACK',
  'CONSISTENCY',
  'OTHER'
]);

const mediaTypeEnum = z.enum(['NONE', 'IMAGE', 'VIDEO']);
const statusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// Admin Schemas
export const createHallOfFameSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title is too short").max(200, "Title is too long"),
    short_description: z.string().max(500).optional().nullable(),
    story: z.string().min(10, "Story is too short"),
    person_name: z.string().min(2, "Name is too short").max(100, "Name is too long"),
    person_role: z.string().max(100).optional().nullable(),
    country_id: z.string().uuid("Invalid country ID"),
    education_node_ids: z.array(z.string().uuid("Invalid education node ID")).min(1, "At least one education node is required"),
    achievement_type: achievementTypeEnum,
    achievement_year: z.number().int().min(1900).max(2100),
    result_label: z.string().max(100).optional().nullable(),
    result_before: z.string().max(100).optional().nullable(),
    result_after: z.string().max(100).optional().nullable(),
    media_type: mediaTypeEnum.optional(),
    media_key: z.string().optional().nullable(),
    thumbnail_key: z.string().optional().nullable(),
    status: statusEnum.optional(),
    is_featured: z.boolean().optional(),
  })
});

export const updateHallOfFameSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    short_description: z.string().max(500).optional().nullable(),
    story: z.string().min(10).optional(),
    person_name: z.string().min(2).max(100).optional(),
    person_role: z.string().max(100).optional().nullable(),
    country_id: z.string().uuid().optional(),
    education_node_ids: z.array(z.string().uuid()).optional(),
    achievement_type: achievementTypeEnum.optional(),
    achievement_year: z.number().int().min(1900).max(2100).optional(),
    result_label: z.string().max(100).optional().nullable(),
    result_before: z.string().max(100).optional().nullable(),
    result_after: z.string().max(100).optional().nullable(),
    media_type: mediaTypeEnum.optional(),
    media_key: z.string().optional().nullable(),
    thumbnail_key: z.string().optional().nullable(),
    status: statusEnum.optional(),
    is_featured: z.boolean().optional(),
  })
});

// Admin Filter Schemas
export const getAdminHallOfFameSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    country_id: z.string().uuid().optional(),
    education_node_id: z.string().uuid().optional(),
    achievement_type: achievementTypeEnum.optional(),
    achievement_year: z.coerce.number().int().optional(),
    status: statusEnum.optional(),
    is_featured: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
    media_type: mediaTypeEnum.optional(),
    sort: z.enum(['latest', 'oldest', 'most_viewed', 'most_liked', 'most_helpful', 'most_saved']).optional()
  })
});

// Public Filter Schemas
export const getPublicHallOfFameSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    search: z.string().optional(),
    country_id: z.string().uuid().optional(),
    education_node_id: z.string().uuid().optional(),
    achievement_type: achievementTypeEnum.optional(),
    achievement_year: z.coerce.number().int().optional(),
    sort: z.enum(['latest', 'oldest', 'trending', 'most_liked', 'most_helpful', 'most_saved']).optional()
  })
});

// Comments
export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment is too long"),
    parent_comment_id: z.string().uuid().optional().nullable()
  })
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment is too long")
  })
});

export type CreateHallOfFameInput = z.infer<typeof createHallOfFameSchema>["body"];
export type UpdateHallOfFameInput = z.infer<typeof updateHallOfFameSchema>["body"];
export type CreateCommentInput = z.infer<typeof createCommentSchema>["body"];
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>["body"];

// Response Schemas for OpenAPI
export const StorySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  short_description: z.string().nullable(),
  story: z.string(),
  person_name: z.string(),
  person_role: z.string().nullable(),
  achievement_type: achievementTypeEnum,
  achievement_year: z.number(),
  result_label: z.string().nullable(),
  result_before: z.string().nullable(),
  result_after: z.string().nullable(),
  country_id: z.string().uuid(),
  media_type: mediaTypeEnum,
  media_url: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  status: statusEnum,
  is_featured: z.boolean(),
  admin_id: z.string().uuid(),
  published_at: z.string().datetime().nullable(),
  views_count: z.number(),
  likes_count: z.number(),
  helpful_count: z.number(),
  saves_count: z.number(),
  comments_count: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  country: z.object({ id: z.string().uuid(), name: z.string() }).optional(),
  education_nodes: z.array(z.object({ id: z.string().uuid(), name: z.string(), node_type: z.string() })).optional(),
  viewer: z.object({ liked: z.boolean(), helpful: z.boolean(), saved: z.boolean() }).optional(),
});

export const StoryListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(StorySchema),
  nextCursor: z.string().datetime().optional()
});

export const SingleStoryResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: StorySchema
});

export const FiltersResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    years: z.array(z.number()),
    achievement_types: z.array(z.string()),
    countries: z.array(z.object({ id: z.string(), name: z.string() }))
  })
});

export const StatsResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    total_stories: z.number(),
    published_stories: z.number(),
    drafts: z.number(),
    featured: z.number(),
    total_views: z.number(),
    total_likes: z.number(),
    total_helpful: z.number(),
    total_saves: z.number(),
    total_comments: z.number()
  })
});

export const GenericSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional()
});

export const CommentSchema = z.object({
  id: z.string().uuid(),
  hall_of_fame_id: z.string().uuid(),
  user_id: z.string().uuid(),
  parent_comment_id: z.string().uuid().nullable(),
  content: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  author: z.object({
    name: z.string(),
    avatar_url: z.string().url().nullable()
  }).optional()
});

export const CommentListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(CommentSchema),
  nextCursor: z.string().optional().nullable()
});

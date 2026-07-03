import { z } from "zod";

export const storySchema = z.object({
  body: z.object({
    imageUrl: z.string().url("Invalid image URL"),
  }),
});

export const viewStorySchema = z.object({
  params: z.object({
    userId: z.string().uuid("Invalid user ID"),
  }),
});

export type StoryInput = z.infer<typeof storySchema>["body"];
export type ViewStoryParams = z.infer<typeof viewStorySchema>["params"];

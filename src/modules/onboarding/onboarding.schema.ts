import { z } from "zod";

export const countrySchema = z.object({
  body: z.object({
    countryId: z.string().uuid("Invalid country ID"),
  }),
});

export const profileSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, "Full name is required").optional(),
    profileImage: z.string().nullable().optional(),
    age: z.number().int().min(13, "Must be at least 13").max(120).optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    state: z.string().min(1, "State is required").optional(),
    bio: z.string().max(1000, "Bio is too long").optional(),
  }),
});

export const examsSchema = z.object({
  body: z.object({
    examIds: z.array(z.string().uuid("Invalid exam ID")),
  }),
});

export const studySchema = z.object({
  body: z.object({
    strongIn: z.string().optional(),
    needHelpWith: z.string().optional(),
    studyTime: z.enum(["morning", "afternoon", "evening", "late_night"]).optional(),
  }),
});

export const preferencesSchema = z.object({
  body: z.object({
    lookingFor: z.array(z.string()).optional(),
  }),
});

export const enhanceBioSchema = z.object({
  body: z.object({
    bio: z
      .string()
      .min(10, "Bio must be at least 10 characters")
      .max(500, "Bio must be at most 500 characters")
      .trim(),
  }),
});

export type CountryInput = z.infer<typeof countrySchema>["body"];
export type ProfileInput = z.infer<typeof profileSchema>["body"];
export type ExamsInput = z.infer<typeof examsSchema>["body"];
export type StudyInput = z.infer<typeof studySchema>["body"];
export type PreferencesInput = z.infer<typeof preferencesSchema>["body"];
export type EnhanceBioInput = z.infer<typeof enhanceBioSchema>["body"];

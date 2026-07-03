import { z } from "zod";

export const presignedUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, "File name is required"),
    contentType: z.string().regex(/^image\/(jpeg|png|webp|gif|svg\+xml)$/, "Only image types are allowed"),
  }),
});

export type PresignedUrlBody = z.infer<typeof presignedUrlSchema>["body"];

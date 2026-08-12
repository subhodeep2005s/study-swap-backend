import { z } from "zod";

const allowedContentTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  // Documents
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain", // .txt
  "application/octet-stream", // generic fallback
  "application/zip", // .zip
  "application/x-zip-compressed", // windows zip
];

export const presignedUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, "File name is required"),
    contentType: z.string().refine((val) => allowedContentTypes.includes(val), "Invalid content type"),
    uploadType: z.enum(["profile", "anonymous-avatar", "forum-media", "note-document"]).default("profile"),
  }),
});

export type PresignedUrlBody = z.infer<typeof presignedUrlSchema>["body"];

import { z } from "zod";

const allowedContentTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain", // .txt
];

export const presignedUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, "File name is required"),
    contentType: z.string().refine((val) => allowedContentTypes.includes(val), "Invalid content type"),
  }),
});

export type PresignedUrlBody = z.infer<typeof presignedUrlSchema>["body"];

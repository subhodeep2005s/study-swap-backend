import type { Request, Response } from "express";
import { asyncHandler } from "@/core/utils/async-handler";
import { getPresignedUploadUrl } from "@/config/s3";
import type { PresignedUrlBody } from "./uploads.schema";
import crypto from "crypto";

export const generatePresignedUrl = asyncHandler(
  async (req: Request<{}, {}, PresignedUrlBody>, res: Response) => {
    const { fileName, contentType } = req.body;
    const userId = req.user!.id;

    // Generate a unique key for the file to avoid collisions
    const fileExtension = fileName.split(".").pop();
    const uniqueId = crypto.randomBytes(8).toString("hex");
    const key = `profile-images/${userId}/${uniqueId}.${fileExtension}`;

    // Get the presigned URL from S3 (expires in 5 minutes)
    const url = await getPresignedUploadUrl(key, contentType, 300);
    const publicUrl = url.split("?")[0]; // the base URL without query params

    res.status(200).json({
      success: true,
      message: "Presigned URL generated successfully",
      data: {
        uploadUrl: url,
        key: key,
        publicUrl: publicUrl,
      },
    });
  }
);

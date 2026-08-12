import { s3Client, s3BucketName } from "@/config/s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "@/config/logger";
import { fromBuffer } from "pdf2pic";
import sharp from "sharp";
import crypto from "crypto";

export class ThumbnailService {
  /**
   * Generates a thumbnail for a given file key in S3 and uploads it.
   * Returns the generated thumbnail key, or null if generation fails.
   */
  static async generateAndUploadThumbnail(fileKey: string, mimeType: string, uploaderId: string): Promise<string | null> {
    try {
      logger.info(`[THUMBNAIL] Starting generation for ${fileKey}`);
      
      // 1. Download original file from S3
      const getCommand = new GetObjectCommand({
        Bucket: s3BucketName,
        Key: fileKey,
      });
      const response = await s3Client.send(getCommand);
      
      if (!response.Body) {
        throw new Error("S3 object body is empty");
      }
      
      // Convert stream to buffer
      const originalBuffer = await response.Body.transformToByteArray();
      const buffer = Buffer.from(originalBuffer);
      
      let thumbnailBuffer: Buffer | null = null;
      
      // 2. Process based on MIME type
      if (mimeType === 'application/pdf') {
        logger.info(`[THUMBNAIL] PDF upload detected. Extracting first page...`);
        const options = {
          density: 150,
          saveFilename: "temp",
          savePath: "/tmp",
          format: "png",
          width: 800,
          height: 1035,
        };
        const convert = fromBuffer(buffer, options);
        // Page 1, output as buffer
        const pageOutput = await convert(1, { responseType: "buffer" }) as any;
        if (!pageOutput || !pageOutput.buffer) {
          throw new Error("Failed to extract page from PDF");
        }
        logger.info(`[THUMBNAIL] First page extracted successfully`);
        
        thumbnailBuffer = Buffer.from(pageOutput.buffer);
      } else if (mimeType.startsWith('image/')) {
        logger.info(`[THUMBNAIL] Image upload detected.`);
        thumbnailBuffer = buffer;
      } else {
        logger.info(`[THUMBNAIL] Unsupported format for thumbnail generation: ${mimeType}`);
        return null;
      }
      
      // 3. Resize and convert to WebP
      logger.info(`[THUMBNAIL] Generating optimized WebP...`);
      const finalWebpBuffer = await sharp(thumbnailBuffer)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
        
      // 4. Upload to S3
      const uniqueId = crypto.randomBytes(8).toString("hex");
      const thumbnailKey = `notes/thumbnails/${uploaderId}/${uniqueId}.webp`;
      
      logger.info(`[THUMBNAIL] Uploading to S3 as ${thumbnailKey}...`);
      const putCommand = new PutObjectCommand({
        Bucket: s3BucketName,
        Key: thumbnailKey,
        Body: finalWebpBuffer,
        ContentType: 'image/webp',
      });
      await s3Client.send(putCommand);
      
      logger.info(`[THUMBNAIL] Uploaded to S3 successfully`);
      return thumbnailKey;
      
    } catch (error: any) {
      logger.error(`[THUMBNAIL] ⚠️ Thumbnail generation failed: ${error.message}`);
      return null;
    }
  }
}

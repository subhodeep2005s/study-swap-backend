import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";

export const s3BucketName = env.BUCKET_NAME;
export const s3Region = env.REGION_NAME;

export const s3Client = new S3Client({
  region: s3Region,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_KEY,
  },
});

export const getS3ObjectUrl = (key: string) =>
  `https://${s3BucketName}.s3.${s3Region}.amazonaws.com/${key}`;

/**
 * Generate a presigned PUT URL for uploading any file to S3.
 * Expires in 5 minutes by default.
 */
export const getPresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: s3BucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Generate a presigned GET URL for downloading a file from S3.
 * Expires in 15 minutes by default.
 */
export const getPresignedDownloadUrl = async (
  key: string,
  expiresIn = 900
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

export const deleteS3Object = async (key?: string | null) => {
  if (!key) return;

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: s3BucketName,
      Key: key,
    })
  );
};

export const deleteS3Prefix = async (prefix: string) => {
  let continuationToken: string | undefined;

  do {
    const listedObjects = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: s3BucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const objects = listedObjects.Contents?.map((item) => item.Key).filter(
      (key): key is string => Boolean(key)
    );

    if (objects && objects.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: s3BucketName,
          Delete: {
            Objects: objects.map((key) => ({ Key: key })),
            Quiet: true,
          },
        })
      );
    }

    continuationToken = listedObjects.IsTruncated
      ? listedObjects.NextContinuationToken
      : undefined;
  } while (continuationToken);
};

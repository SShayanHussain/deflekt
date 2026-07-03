import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import fs from "fs/promises";
import path from "path";

let s3Client: S3Client | null = null;

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a file to S3.
 * Returns the object key.
 */
export async function uploadSourceFile(
  workspaceId: string,
  fileName: string,
  fileContent: Buffer,
  contentType: string
): Promise<string> {
  const key = `workspaces/${workspaceId}/sources/${Date.now()}-${fileName}`;

  if (!s3Client || !env.AWS_S3_BUCKET) {
    console.warn("No AWS credentials provided, saving file to local volume.");
    const localPath = path.join("/app/uploads", key);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, fileContent);
    return `local://${key}`;
  }

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: fileContent,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

/**
 * Generates a presigned URL for downloading the file.
 */
export async function getPresignedUrl(key: string): Promise<string> {
  if (!s3Client || !env.AWS_S3_BUCKET || key.startsWith("local://") || key.startsWith("mock-s3-key")) {
    return `http://localhost/mock-url/${key}`;
  }

  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  // URL expires in 1 hour
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Deletes a file from S3 or local storage.
 */
export async function deleteSourceFile(key: string): Promise<void> {
  if (key.startsWith("local://")) {
    try {
      const localPath = path.join("/app/uploads", key.replace("local://", ""));
      await fs.unlink(localPath);
    } catch (e) {
      console.error("Failed to delete local file:", e);
    }
    return;
  }

  if (!s3Client || !env.AWS_S3_BUCKET || key.startsWith("mock-s3-key")) {
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

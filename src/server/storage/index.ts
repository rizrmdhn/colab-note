import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "./config";
import { env } from "@/env";

const s3 = new S3Client(config);

const bucketName = env.AWS_BUCKET_NAME;

export async function uploadFile(fileName: string, file: File) {
  // convert file to buffer
  const buffer = await file.arrayBuffer();
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: new Uint8Array(buffer),
  });

  return await s3.send(command);
}

export async function deleteFile(fileName: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });

  return await s3.send(command);
}

export async function generatePresignedUrl(fileName: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });

  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

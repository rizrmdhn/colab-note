import { env } from "@/env";
import { type S3ClientConfig } from "@aws-sdk/client-s3";

export default {
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY,
    secretAccessKey: env.AWS_SECRET_KEY,
  },
  region: env.AWS_REGION,
} as S3ClientConfig;

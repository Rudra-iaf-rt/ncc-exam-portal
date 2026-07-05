const { S3Client } = require("@aws-sdk/client-s3");
require("./load-env");

const REQUIRED_VARS = [
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_ENDPOINT",
  "B2_BUCKET_NAME",
];

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    throw new Error(
      `[B2] Missing required environment variable: ${key}. ` +
        `Check your .env file and ensure all B2_* variables are set.`
    );
  }
}

const b2Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
});

const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

console.log(`[B2] Client initialized for bucket: ${B2_BUCKET_NAME}`);

module.exports = { b2Client, B2_BUCKET_NAME };

require('dotenv').config({ path: './.env' });
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

async function setupCors() {
  try {
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    const command = new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000
          }
        ]
      }
    });

    console.log("Applying CORS configuration to R2 bucket...");
    await s3Client.send(command);
    console.log("SUCCESS! CORS policy applied.");
  } catch(e) {
    console.error("ERROR configuring CORS:", e);
  }
}

setupCors();

require('dotenv').config();
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

async function run() {
  const bucketName = process.env.R2_BUCKET_NAME || '';
  const fileUrl = 'https://676b4f5b370dc8c9809d82b30e14ed1b.r2.cloudflarestorage.com/music-app/songs/1785410157428-Chendumallika%20Poovu%204K%20%20Video%20Song%20_%20Aarya%202%20_%20Vijay%20Yesudas%20_%20Devi%20Sri%20Prasad%20_%20Hi-Fi%20Songs_320k.mp3';
  const keyParts = fileUrl.split(`/${bucketName}/`);
  const key = keyParts.length > 1 ? keyParts[1] : fileUrl; 
  
  console.log('Bucket:', bucketName);
  console.log('Raw Key:', key);
  console.log('Decoded Key:', decodeURIComponent(key));

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: decodeURIComponent(key),
    });

    const response = await s3Client.send(command);
    console.log('Success! ContentLength:', response.ContentLength);
  } catch (err) {
    console.error('S3 Error:', err.name, err.message);
  }
}

run();

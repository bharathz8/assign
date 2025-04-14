import { google } from 'googleapis';
import vision from "@google-cloud/vision";
import { Storage } from '@google-cloud/storage';
import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_APPLICATION_CREDENTIALS'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`Warning: ${varName} environment variable is not set`);
  }
});

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );
  
  // Create a Vision client
  const visionClient = new vision.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || '../credentials.json'
  });
  
  // Create a Storage client
  const storageClient = new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || '../credentials.json'
  });
  
  // Drive API instance
   const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
  });

  export {oauth2Client, drive, visionClient, storageClient};
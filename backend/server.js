import app from './app.js';
import { mongoose } from './config/database.js';
import { createWorker } from 'tesseract.js';

const PORT = process.env.PORT || 3000;

let ocrWorker = null;
let isInitializingOCR = false;

async function initOCR() {
  if (isInitializingOCR) return;
  isInitializingOCR = true;
  ocrWorker = await createWorker("eng");
  console.log('OCR initialized');
  isInitializingOCR = false;
}

async function initializeOCRWithRetry(maxRetries = 3, delay = 5000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await initOCR();
      return;
    } catch (err) {
      console.error(`OCR init failed (attempt ${attempt + 1}):`, err);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.warn('Starting server without OCR initialized');
}

function shutdown() {
  console.log('Shutting down server...');
  mongoose.connection.close()
    .then(() => console.log('MongoDB connection closed'))
    .catch(err => console.error('Error closing MongoDB connection:', err));

  if (ocrWorker) {
    ocrWorker.terminate()
      .then(() => {
        console.log('OCR worker terminated');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error terminating OCR worker:', err);
        process.exit(1);
      });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start app
initializeOCRWithRetry();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

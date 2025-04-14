
export async function initOCR() {
    if (isInitializingOCR) {
      // Wait for initialization to complete if already in progress
      while (isInitializingOCR) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }
    
    try {
      isInitializingOCR = true;
      ocrWorker = await createWorker("eng");
      console.log('OCR initialized');
    } catch (error) {
      console.error('Error initializing OCR:', error);
      throw error;
    } finally {
      isInitializingOCR = false;
    }
  }

  export async function initializeOCRWithRetry(maxRetries = 3, delay = 5000) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await initOCR();
        return; // Success
      } catch (error) {
        retries++;
        console.error(`OCR initialization failed (attempt ${retries}/${maxRetries}):`, error);
        
        if (retries < maxRetries) {
          console.log(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('Max retries reached. Starting server without OCR functionality.');
        }
      }
    }
  }
export async function extractTextFromPDF(filePath) {
  try {
    // Check if file exists and has content
    const isValid = await isValidFile(filePath);
    if (!isValid) {
      throw new Error('Invalid or empty PDF file');
    }
    
    // Read file into buffer
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF
    const pdfData = await pdfParse(dataBuffer);
    
    return pdfData.text || '';
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return '';
  }
}

async function extractTextFromPDFWithVision(filePath) {
  try {
    // Check if file exists and has content
    const isValid = await isValidFile(filePath);
    if (!isValid) {
      throw new Error('Invalid or empty PDF file');
    }
    
    // Read file into buffer
    const pdfBuffer = fs.readFileSync(filePath);
    
    if (!process.env.GOOGLE_CLOUD_STORAGE_BUCKET) {
      console.log('GCS bucket not configured, falling back to default PDF parser');
      return await extractTextFromPDF(filePath);
    }
    
    const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    const outputPrefix = `output-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const outputUri = `gs://${bucketName}/${outputPrefix}/`;
    
    // Prepare the request - for PDFs we need to use asyncBatchAnnotate
    const request = {
      inputConfig: {
        mimeType: 'application/pdf',
        content: pdfBuffer,
      },
      features: [
        {type: 'DOCUMENT_TEXT_DETECTION'}
      ],
      outputConfig: {
        gcsDestination: {
          uri: outputUri
        }
      }
    };
    
    // Start the async operation
    const [operation] = await visionClient.asyncBatchAnnotateFiles({requests: [request]});
    
    // Wait for the operation to complete
    const [filesResponse] = await operation.promise();
    
    if (!filesResponse.responses || filesResponse.responses.length === 0) {
      console.warn('No responses from Vision API batch operation');
      return await extractTextFromPDF(filePath);
    }
    
    // Get the result from GCS
    const bucket = storageClient.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: outputPrefix });
    
    if (!files || files.length === 0) {
      console.warn('No output files found in GCS bucket');
      return await extractTextFromPDF(filePath);
    }
    
    // Get the content of the first JSON file
    const outputFile = files.find(file => file.name.endsWith('.json'));
    if (!outputFile) {
      console.warn('No JSON output file found in GCS bucket');
      return await extractTextFromPDF(filePath);
    }
    
    const [content] = await outputFile.download();
    const jsonContent = JSON.parse(content.toString());
    
    // Extract text from the JSON response
    let extractedText = '';
    if (jsonContent.responses && jsonContent.responses.length > 0) {
      const pages = jsonContent.responses[0].fullTextAnnotation?.pages || [];
      pages.forEach(page => {
        page.blocks?.forEach(block => {
          block.paragraphs?.forEach(paragraph => {
            paragraph.words?.forEach(word => {
              word.symbols?.forEach(symbol => {
                extractedText += symbol.text || '';
                if (symbol.property?.detectedBreak) {
                  extractedText += ' ';
                }
              });
            });
            extractedText += '\n';
          });
        });
      });
    }
    
    // Clean up GCS files
    await Promise.all(files.map(file => file.delete()));
    
    return extractedText || await extractTextFromPDF(filePath);
  } catch (error) {
    console.error('Error extracting PDF text with Vision API:', error);
    console.log('Falling back to default PDF parser');
    return await extractTextFromPDF(filePath);
  }
}

export async function extractTextFromImage(filePath) {
    try {
      // Check if file exists and has content
      const isValid = await isValidFile(filePath);
      if (!isValid) {
        throw new Error('Invalid or empty image file');
      }
      
      // Read file into buffer
      const imageBuffer = fs.readFileSync(filePath);
      
      // Detect text in the image
      const [result] = await visionClient.textDetection(imageBuffer);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        console.log('No text found in image');
        return '';
      }
      
      // The first annotation contains the full text
      return detections[0].description || '';
    } catch (error) {
      console.error('Error extracting image text with Vision API:', error);
      return '';
    }
  }

  export async function isValidFile(filePath) {
    try {
      const stats = await promisify(fs.stat)(filePath);
      return stats.size > 0;
    } catch (error) {
      return false;
    }
  }
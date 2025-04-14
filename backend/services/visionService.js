export async function analyzeDocumentWithVision(filePath, mimeType) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Request features for document processing
    const request = {
      image: {content: fileBuffer},
      features: [
        {type: 'DOCUMENT_TEXT_DETECTION'},
        {type: 'OBJECT_LOCALIZATION'}
      ]
    };
    
    // Process the request
    const [result] = await visionClient.annotateImage(request);
    
    return {
      fullText: result.fullTextAnnotation ? result.fullTextAnnotation.text : '',
      pages: result.fullTextAnnotation ? result.fullTextAnnotation.pages : [],
      objects: result.localizedObjectAnnotations || []
    };
  } catch (error) {
    console.error('Error analyzing document with Vision:', error);
    throw error;
  }
}
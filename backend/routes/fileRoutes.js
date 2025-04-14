import express from "express";
import { drive } from "../config/google.js";

const router = express.Router();

router.get('/files', async (req, res) => {
    try {
      const query = "mimeType contains 'application/pdf' or mimeType contains 'image/'";
      
      const response = await drive.files.list({
        q: query,
        pageSize: 25,
        fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink)'
      });
      
      // Handle no files found
      if (!response.data.files || response.data.files.length === 0) {
        return res.json([]);
      }
      
      const fileAnalysisPromises = response.data.files.map(async (file) => {
        const fileName = file.name.toLowerCase();
        const keywords = ['bank', 'statement', 'insurance', 'policy', 'vehicle'];
        
        // If filename contains keywords, consider it relevant without OCR
        if (keywords.some(keyword => fileName.includes(keyword))) {
          return { ...file, relevanceScore: 100, matchedByName: true };
        }
        
        if (file.size && parseInt(file.size) < 10 * 1024 * 1024) {
          try {
            const downloadedFile = await downloadFile(file.id).catch(err => {
              console.error(`Error downloading file ${file.name}:`, err);
              return null;
            });
            
            if (!downloadedFile) {
              return { ...file, relevanceScore: 0, downloadError: true };
            }
            
            let extractedText = '';
            
            try {
              if (downloadedFile.mimeType === 'application/pdf') {
                extractedText = await extractTextFromPDF(downloadedFile.path);
              } else if (downloadedFile.mimeType.startsWith('image/')) {
                extractedText = await extractTextFromImage(downloadedFile.path);
              }
            } catch (processingError) {
              console.error(`Error processing file ${file.name}:`, processingError);
            } finally {
              try { fs.unlinkSync(downloadedFile.path); } catch (e) {}
            }
            
            const isRelevant = containsRelevantInfo(extractedText);
            const containStaticData = isStaticFile(extractedText);
            return { 
              ...file, 
              relevanceScore: isRelevant ? 80 : 0,
              matchedByOCR: isRelevant,
              textExtracted: extractedText.length > 0,
              containStaticData: containStaticData
            };
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            return { ...file, relevanceScore: 0, ocrError: true };
          }
        }
        
        return { ...file, relevanceScore: 0, skippedOCR: true };
      });
      
      // Run with concurrency limit to avoid overwhelming resources
      const analyzedFiles = [];
      const concurrencyLimit = 3; // Process 3 files at a time
      
      for (let i = 0; i < response.data.files.length; i += concurrencyLimit) {
        const batch = response.data.files.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map((file, index) => fileAnalysisPromises[i + index]);
        const batchResults = await Promise.all(batchPromises);
        analyzedFiles.push(...batchResults);
      }
      
      // Filter and sort by relevance
      const relevantFiles = analyzedFiles
        .filter(file => file.relevanceScore > 0 && !file.containStaticData)
        .sort((a, b) => b.relevanceScore - a.relevanceScore); 
        
        res.json(relevantFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files from Google Drive' });
    }
  });
  
  // Get file details
  router.get('/files/:fileId', async (req, res) => {
    try {
      const response = await drive.files.get({
        fileId: req.params.fileId,
        fields: 'id, name, mimeType, createdTime, modifiedTime, size, webViewLink, description, owners'
      });
      
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching file details:', error);
      res.status(500).json({ error: 'Failed to fetch file details' });
    }
  });


  router.get('/files/:fileId/content', async (req, res) => {
    try {
      // Get file metadata to check the type
      const fileMetadata = await drive.files.get({
        fileId: req.params.fileId,
        fields: 'name, mimeType, size'
      });
      
      // Check file size
      const fileSize = parseInt(fileMetadata.data.size || '0');
      if (fileSize === 0) {
        return res.status(400).json({ error: 'Empty file' });
      }
      
      // Set appropriate headers based on file type
      res.setHeader('Content-Type', fileMetadata.data.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.data.name}"`);
      
      // Get the file content
      const response = await drive.files.get({
        fileId: req.params.fileId,
        alt: 'media'
      }, { responseType: 'stream' });
      
      // Set timeout on the response
      let timeout = setTimeout(() => {
        response.data.destroy();
        if (!res.headersSent) {
          res.status(504).json({ error: 'Download timeout' });
        }
      }, 60000); // 60 second timeout
      
      // Clear timeout when download completes
      response.data.on('end', () => {
        clearTimeout(timeout);
      });
      
      // Handle errors
      response.data.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Error streaming file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      });
      
      // Pipe the file content to the response
      response.data.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ error: 'Failed to download file from Google Drive' });
    }
  });


  router.get('/files/:fileId/analyze', async (req, res) => {
    try {
      // Download the file
      let downloadedFile;
      try {
        downloadedFile = await downloadFile(req.params.fileId);
      } catch (downloadError) {
        console.error('Error downloading file for analysis:', downloadError);
        return res.status(400).json({ 
          error: 'Failed to download file', 
          details: downloadError.message 
        });
      }
      
      let extractedText = '';
      let processingError = null;
      let analysisResult = null;
      
      try {
        if (downloadedFile.mimeType === 'application/pdf') {
          // Use Vision API for PDFs if configured, otherwise use original function
          if (process.env.USE_VISION_FOR_PDF === 'true') {
            extractedText = await extractTextFromPDFWithVision(downloadedFile.path);
          } else {
            extractedText = await extractTextFromPDF(downloadedFile.path);
          }
        } else if (downloadedFile.mimeType.startsWith('image/')) {
          // Always use Vision API for images
          extractedText = await extractTextFromImage(downloadedFile.path);
          
          // For images, also get additional document analysis if available
          try {
            analysisResult = await analyzeDocumentWithVision(downloadedFile.path, downloadedFile.mimeType);
          } catch (analysisError) {
            console.error('Error with detailed document analysis:', analysisError);
          }
        } else {
          return res.status(400).json({ error: 'Unsupported file type for OCR analysis' });
        }
      } catch (error) {
        console.error('Error processing file content:', error);
        processingError = error.message;
      } finally {
        // Clean up the temp file
        try { fs.unlinkSync(downloadedFile.path); } catch (e) {}
      }
      
      // Determine the relevance
      const isRelevant = containsRelevantInfo(extractedText);
      const hasStaticData = isStaticFile(extractedText);
      const documentClassification = classifyFinancialDocument(extractedText);
      
      // Extract structured data based on document type
      const extractionResults = extractDataFromDocument(extractedText, documentClassification.type);
  
      let assetSaveResult = null;
      if (extractionResults.success && documentClassification.type !== 'unknown') {
        // Save the extracted data to the database
        assetSaveResult = await assetRoutes.addExtractedAssets(
          req.params.fileId,
          downloadedFile.name,
          documentClassification.type,
          extractionResults
        );
      }
      
      // Return the results
      res.json({
        fileName: downloadedFile.name,
        mimeType: downloadedFile.mimeType,
        extractedText: extractedText,
        wordCount: extractedText ? extractedText.split(/\s+/).length : 0,
        isRelevant: isRelevant,
        relevanceScore: isRelevant ? 80 : 0,
        hasStaticData: hasStaticData,
        documentType: documentClassification.type,
        documentTypeConfidence: documentClassification.confidence,
        classificationMethod: documentClassification.method,
        processingError: processingError,
        documentAnalysis: analysisResult,
        structuredData: {
          success: extractionResults.success,
          confidence: extractionResults.confidence,
          data: extractionResults.data
        },
        savedToDatabase: assetSaveResult
      });
      
    } catch (error) {
      console.error('Error analyzing file:', error);
      res.status(500).json({ error: 'Failed to analyze file', details: error.message });
    }
  });

  export default router;
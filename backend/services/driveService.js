export async function downloadFile(fileId) {
  const tempFilePath = path.join(os.tmpdir(), `gdrive-${fileId}`);
  
  return new Promise(async (resolve, reject) => {
    try {
      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'name, mimeType, size'
      });
      
      // Check file size
      const fileSize = parseInt(fileMetadata.data.size || '0');
      if (fileSize === 0) {
        return reject(new Error('Empty file'));
      }
      
      if (fileSize > 15 * 1024 * 1024) {
        return reject(new Error('File too large for processing'));
      }
      
      const dest = fs.createWriteStream(tempFilePath);
      
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });
      
      let downloadComplete = false;
      
      response.data
        .on('end', () => {
          downloadComplete = true;
          // Validate file before resolving
          isValidFile(tempFilePath).then(isValid => {
            if (isValid) {
              resolve({
                path: tempFilePath,
                mimeType: fileMetadata.data.mimeType,
                name: fileMetadata.data.name
              });
            } else {
              reject(new Error('Downloaded file is invalid or corrupted'));
              // Clean up invalid file
              try { fs.unlinkSync(tempFilePath); } catch (e) {}
            }
          });
        })
        .on('error', err => {
          reject(err);
          // Clean up on error
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        })
        .pipe(dest);
      
      // Add timeout for download
      setTimeout(() => {
        if (!downloadComplete) {
          reject(new Error('Download timeout'));
          response.data.destroy(); // Cancel the download
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
      }, 30000); // 30 second timeout
    } catch (error) {
      reject(error);
      // Clean up on error
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
  });
}
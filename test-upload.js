const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://opjjqxofwb.execute-api.us-east-1.amazonaws.com/prod';

async function uploadDocument(filePath) {
  try {
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    const base64Content = fileBuffer.toString('base64');
    const fileName = path.basename(filePath);
    
    // Determine file type
    let fileType;
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
      fileType = 'application/pdf';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      fileType = 'image/jpeg';
    } else if (ext === '.png') {
      fileType = 'image/png';
    } else {
      throw new Error('Unsupported file type');
    }

    console.log(`Uploading ${fileName} (${fileType})...`);

    // Upload the document
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileContent: base64Content,
        fileType
      })
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    
    return result.documentId;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

async function checkDocumentStatus(documentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`);
    if (!response.ok) {
      throw new Error(`Failed to get document status: ${response.statusText}`);
    }
    
    const document = await response.json();
    console.log(`Document ${documentId} status: ${document.status}`);
    
    if (document.status === 'COMPLETED') {
      console.log('Processing completed!');
      console.log('Classification:', document.classification, `(${document.classificationConfidence}%)`);
      console.log('Summary:', document.summary);
      console.log('OCR Results:', document.ocrResults);
      return true;
    } else if (document.status === 'FAILED') {
      console.log('Processing failed:', document.errorMessage);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Status check error:', error);
    return false;
  }
}

async function testEndToEnd() {
  const sampleFiles = [
    '/home/pandson/ea_sample_docs/idp_docs/DriversLicense.jpeg',
    '/home/pandson/ea_sample_docs/idp_docs/Invoice.png',
    '/home/pandson/ea_sample_docs/idp_docs/Receipt_26Aug2025_084539.pdf'
  ];

  for (const filePath of sampleFiles) {
    try {
      console.log(`\n=== Testing ${path.basename(filePath)} ===`);
      
      // Upload document
      const documentId = await uploadDocument(filePath);
      
      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes
      
      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        completed = await checkDocumentStatus(documentId);
        attempts++;
      }
      
      if (!completed) {
        console.log('Processing timed out after 5 minutes');
      }
      
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error);
    }
  }
}

// Run the test
testEndToEnd().catch(console.error);

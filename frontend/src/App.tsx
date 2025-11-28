import React, { useState, useCallback } from 'react';
import './App.css';

const API_BASE_URL = 'https://opjjqxofwb.execute-api.us-east-1.amazonaws.com/prod';

interface DocumentResult {
  documentId: string;
  fileName: string;
  fileType: string;
  uploadTimestamp: string;
  status: string;
  ocrResults?: string;
  classification?: string;
  classificationConfidence?: number;
  summary?: string;
  processingTimestamp?: string;
  errorMessage?: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentResult[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Invalid file type. Only JPEG, PNG, and PDF files are supported.');
        setSelectedFile(null);
      }
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      const base64Content = await convertFileToBase64(selectedFile);
      
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileContent: base64Content,
          fileType: selectedFile.type
        })
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      setSelectedFile(null);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Start polling for the document status
      pollDocumentStatus(result.documentId);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pollDocumentStatus = useCallback(async (documentId: string) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/documents/${documentId}`);
        if (response.ok) {
          const document = await response.json();
          
          // Update the document in the list
          setUploadedDocuments(prev => {
            const existing = prev.find(doc => doc.documentId === documentId);
            if (existing) {
              return prev.map(doc => doc.documentId === documentId ? document : doc);
            } else {
              return [...prev, document];
            }
          });

          // If processing is complete or failed, stop polling
          if (document.status === 'COMPLETED' || document.status === 'FAILED') {
            return;
          }

          // Continue polling if not complete and within attempt limit
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 10000); // Poll every 10 seconds
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    poll();
  }, []);

  const loadAllDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      if (response.ok) {
        const data = await response.json();
        setUploadedDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  React.useEffect(() => {
    loadAllDocuments();
  }, []);

  const formatOcrResults = (ocrResults: string) => {
    try {
      const parsed = JSON.parse(ocrResults);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return ocrResults;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Intelligent Document Processing</h1>
        <p>Upload documents for OCR, classification, and summarization</p>
      </header>

      <main className="main-content">
        {/* Upload Section */}
        <section className="upload-section">
          <h2>Upload Document</h2>
          <div className="upload-area">
            <input
              id="file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {selectedFile && (
              <div className="file-info">
                <p><strong>Selected:</strong> {selectedFile.name}</p>
                <p><strong>Type:</strong> {selectedFile.type}</p>
                <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="upload-button"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </section>

        {/* Documents List */}
        <section className="documents-section">
          <h2>Processed Documents</h2>
          <div className="documents-list">
            {uploadedDocuments.length === 0 ? (
              <p>No documents uploaded yet.</p>
            ) : (
              uploadedDocuments.map((doc) => (
                <div
                  key={doc.documentId}
                  className={`document-item ${selectedDocument?.documentId === doc.documentId ? 'selected' : ''}`}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="document-header">
                    <h3>{doc.fileName}</h3>
                    <span className={`status ${doc.status.toLowerCase()}`}>
                      {doc.status}
                    </span>
                  </div>
                  <div className="document-meta">
                    <p><strong>Type:</strong> {doc.fileType}</p>
                    <p><strong>Uploaded:</strong> {new Date(doc.uploadTimestamp).toLocaleString()}</p>
                    {doc.classification && (
                      <p><strong>Category:</strong> {doc.classification} ({doc.classificationConfidence}%)</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Document Details */}
        {selectedDocument && (
          <section className="document-details">
            <h2>Document Details</h2>
            <div className="details-content">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <p><strong>File Name:</strong> {selectedDocument.fileName}</p>
                <p><strong>File Type:</strong> {selectedDocument.fileType}</p>
                <p><strong>Status:</strong> {selectedDocument.status}</p>
                <p><strong>Uploaded:</strong> {new Date(selectedDocument.uploadTimestamp).toLocaleString()}</p>
                {selectedDocument.processingTimestamp && (
                  <p><strong>Completed:</strong> {new Date(selectedDocument.processingTimestamp).toLocaleString()}</p>
                )}
              </div>

              {selectedDocument.ocrResults && (
                <div className="detail-section">
                  <h3>OCR Results</h3>
                  <pre className="ocr-results">
                    {formatOcrResults(selectedDocument.ocrResults)}
                  </pre>
                </div>
              )}

              {selectedDocument.classification && (
                <div className="detail-section">
                  <h3>Classification</h3>
                  <p><strong>Category:</strong> {selectedDocument.classification}</p>
                  <p><strong>Confidence:</strong> {selectedDocument.classificationConfidence}%</p>
                </div>
              )}

              {selectedDocument.summary && (
                <div className="detail-section">
                  <h3>Summary</h3>
                  <p className="summary-text">{selectedDocument.summary}</p>
                </div>
              )}

              {selectedDocument.errorMessage && (
                <div className="detail-section error">
                  <h3>Error</h3>
                  <p>{selectedDocument.errorMessage}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

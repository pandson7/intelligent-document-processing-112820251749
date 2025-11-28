# Technical Design Document

## Architecture Overview

The Intelligent Document Processing application follows a serverless architecture using AWS services to provide scalable, cost-effective document processing. The system consists of a React frontend, API Gateway for REST endpoints, Lambda functions for processing logic, S3 for document storage, and DynamoDB for results persistence.

## System Architecture

### High-Level Components

1. **Frontend Layer**: React web application hosted locally
2. **API Layer**: AWS API Gateway with REST endpoints
3. **Processing Layer**: AWS Lambda functions for business logic
4. **Storage Layer**: AWS S3 for documents, DynamoDB for structured data
5. **AI/ML Layer**: Amazon Bedrock with Claude 4 for OCR, classification, and summarization

### Component Interactions

```
User → React Frontend → API Gateway → Lambda Functions → Bedrock/S3/DynamoDB
```

## Detailed Design

### Frontend Architecture

**Technology Stack:**
- React.js for user interface
- Local hosting (no CloudFront)
- Responsive design for document upload and results display

**Key Components:**
- Document Upload Component
- Processing Status Component  
- Results Display Component
- Error Handling Component

### API Design

**API Gateway Configuration:**
- REST API with CORS enabled
- Resource-based endpoints for document operations
- Integration with Lambda functions

**Endpoints:**
- `POST /documents` - Upload document
- `GET /documents/{id}` - Get document status and results
- `GET /documents` - List processed documents

### Backend Services

#### Lambda Functions

**1. Document Upload Handler**
- Runtime: Node.js (latest)
- Triggers: API Gateway POST /documents
- Functions: Validate file, store in S3, initiate processing
- Environment: S3 bucket name, DynamoDB table name

**2. OCR Processing Function**
- Runtime: Node.js (latest)
- Triggers: S3 event or Step Functions
- Functions: Extract text using Bedrock Claude 4
- Input Handling: PDF as `document`, images as `image`
- Output: JSON key-value pairs

**3. Classification Function**
- Runtime: Node.js (latest)
- Triggers: OCR completion
- Functions: Categorize documents using Bedrock Claude 4
- Categories: Dietary Supplement, Stationery, Kitchen Supplies, Medicine, Driver License, Invoice, W2, Other

**4. Summarization Function**
- Runtime: Node.js (latest)
- Triggers: Classification completion
- Functions: Generate summaries using Bedrock Claude 4
- Output: Concise document summary

**5. Results Handler**
- Runtime: Node.js (latest)
- Triggers: API Gateway GET requests
- Functions: Retrieve and format results from DynamoDB

#### Step Functions (Optional)
- Orchestrate the three-stage processing pipeline
- Handle error states and retries
- Provide processing status updates

### Data Storage

#### Amazon S3
**Bucket Configuration:**
- Single bucket for document storage
- Folder structure: `documents/{document-id}/{filename}`
- Lifecycle policies for cost optimization
- Versioning disabled (prototype)
- Encryption at rest enabled

**Access Patterns:**
- Upload: Lambda writes documents
- Processing: Lambda reads documents for analysis
- Retention: Documents retained for audit

#### DynamoDB

**Table Design:**
```
Table: DocumentProcessing
Partition Key: documentId (String)
Attributes:
- documentId: Unique identifier
- fileName: Original file name
- fileType: JPEG/PNG/PDF
- uploadTimestamp: ISO timestamp
- status: UPLOADED/PROCESSING/COMPLETED/FAILED
- s3Key: S3 object key
- ocrResults: JSON string of extracted data
- classification: Document category
- classificationConfidence: Confidence score
- summary: Generated summary
- processingTimestamp: Completion timestamp
- errorMessage: Error details if failed
```

**Access Patterns:**
- Primary: Get document by ID
- Secondary: Query by status (GSI if needed)

### AI/ML Integration

#### Amazon Bedrock with Claude 4

**OCR Processing:**
- Model: Claude 4 Sonnet
- Input: Document content (PDF as document, images as image)
- Prompt: Extract all text and structure as JSON key-value pairs
- Output: Structured JSON with extracted information

**Classification:**
- Model: Claude 4 Sonnet  
- Input: OCR results text
- Prompt: Classify into predefined categories
- Output: Category name and confidence score

**Summarization:**
- Model: Claude 4 Sonnet
- Input: OCR results and classification
- Prompt: Generate concise summary highlighting key information
- Output: Summary text (200-300 words)

### Security Design

**Authentication:** None (prototype requirement)

**Authorization:**
- IAM roles for Lambda execution
- S3 bucket policies for Lambda access
- DynamoDB permissions for read/write operations

**Data Protection:**
- S3 encryption at rest
- DynamoDB encryption at rest
- HTTPS for all API communications

### Error Handling

**Strategy:**
- Graceful degradation for processing failures
- Comprehensive logging with CloudWatch
- User-friendly error messages
- Retry logic for transient failures

**Error Types:**
- File format validation errors
- Processing timeout errors
- Service availability errors
- Data corruption errors

### Monitoring and Logging

**CloudWatch Integration:**
- Lambda function logs
- API Gateway access logs
- Custom metrics for processing times
- Error rate monitoring

**Metrics:**
- Document processing success rate
- Average processing time per stage
- Error frequency by type
- Storage utilization

### Deployment Architecture

**Infrastructure as Code:**
- AWS CDK for resource provisioning
- Single stack deployment
- Environment-specific configurations
- No CI/CD pipeline (simple deployment)

**Resource Organization:**
```
CDK Stack: IntelligentDocumentProcessing
├── S3 Bucket
├── DynamoDB Table
├── Lambda Functions (5)
├── API Gateway
├── IAM Roles and Policies
└── CloudWatch Log Groups
```

### Performance Considerations

**Scalability:**
- Lambda auto-scaling for concurrent processing
- DynamoDB on-demand billing for variable load
- S3 unlimited storage capacity

**Optimization:**
- Lambda memory allocation based on processing needs
- DynamoDB query optimization
- S3 transfer acceleration if needed

**Limits:**
- API Gateway: 10,000 requests per second
- Lambda: 1000 concurrent executions (default)
- File size: Maximum 10MB per document

### Testing Strategy

**Unit Testing:**
- Lambda function logic testing
- Input validation testing
- Error handling verification

**Integration Testing:**
- End-to-end pipeline testing
- API endpoint testing
- AWS service integration testing

**Sample Data Testing:**
- Use documents from ~/ea_sample_docs/idp_docs
- Verify all supported formats (JPEG, PNG, PDF)
- Test classification accuracy across categories

### Cost Optimization

**Strategies:**
- On-demand pricing for variable workloads
- S3 lifecycle policies for document retention
- Lambda memory optimization
- DynamoDB capacity planning

**Estimated Components:**
- Lambda: Pay per execution
- S3: Storage and request costs
- DynamoDB: On-demand read/write units
- Bedrock: Token-based pricing
- API Gateway: Request-based pricing

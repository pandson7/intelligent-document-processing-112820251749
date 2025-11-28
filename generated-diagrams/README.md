# Intelligent Document Processing - AWS Architecture Diagrams

This directory contains AWS architecture diagrams for the Intelligent Document Processing application generated based on the technical design specifications.

## Generated Diagrams

### 1. Main Architecture Overview
**File:** `idp_main_architecture.png`
**Description:** High-level system architecture showing the complete flow from user interaction through React frontend, API Gateway, Lambda functions, Amazon Bedrock AI processing, and storage in S3 and DynamoDB.

**Key Components:**
- React Frontend (locally hosted)
- API Gateway (REST endpoints)
- 5 Lambda Functions (Upload, OCR, Classification, Summarization, Results)
- Amazon Bedrock with Claude 4 for AI processing
- S3 for document storage
- DynamoDB for results persistence
- CloudWatch for monitoring

### 2. Document Processing Flow
**File:** `idp_processing_flow.png`
**Description:** Detailed step-by-step processing pipeline showing how documents flow through the system from upload to final results.

**Processing Steps:**
1. Document Upload → S3 Storage + Metadata in DynamoDB
2. OCR Processing → Text extraction using Bedrock Claude 4
3. Classification → Document categorization using AI
4. Summarization → Summary generation using AI
5. Results Retrieval → Final results delivery to frontend

### 3. API Endpoints and Data Flow
**File:** `idp_api_data_flow.png`
**Description:** API-centric view showing the three main endpoints and their data flow patterns.

**API Endpoints:**
- `POST /documents` - Document upload
- `GET /documents/{id}` - Get specific document status and results
- `GET /documents` - List all processed documents

### 4. Security and IAM Architecture
**File:** `idp_security_iam.png`
**Description:** Security-focused diagram showing IAM roles, policies, encryption, and secure access patterns.

**Security Features:**
- HTTPS communication
- IAM roles for Lambda execution
- Encryption at rest for S3 and DynamoDB
- Secure API access to Bedrock
- CloudWatch audit logging
- No authentication required (prototype)

### 5. Deployment and Infrastructure
**File:** `idp_deployment_infrastructure.png`
**Description:** Infrastructure deployment view showing AWS CDK stack resources and operational components.

**Infrastructure Components:**
- AWS CDK for Infrastructure as Code
- CloudFormation stack deployment
- Auto-scaling Lambda functions
- On-demand DynamoDB billing
- CloudWatch monitoring and alarms

## Architecture Highlights

### Serverless Design
- Fully serverless architecture using AWS Lambda
- Auto-scaling based on demand
- Pay-per-use pricing model

### AI-Powered Processing
- Amazon Bedrock with Claude 4 Sonnet model
- Three-stage AI processing: OCR → Classification → Summarization
- Support for PDF and image formats (JPEG, PNG)

### Document Categories
The system classifies documents into these categories:
- Dietary Supplement
- Stationery
- Kitchen Supplies
- Medicine
- Driver License
- Invoice
- W2
- Other

### Storage Strategy
- **S3**: Document storage with encryption at rest
- **DynamoDB**: Structured data storage for processing results
- **CloudWatch**: Comprehensive logging and monitoring

### Performance Considerations
- Concurrent Lambda execution for scalability
- On-demand DynamoDB for variable workloads
- CloudWatch monitoring for performance optimization
- Maximum file size: 10MB per document

## Deployment Instructions

1. Use AWS CDK to deploy the infrastructure stack
2. Configure IAM roles and policies for Lambda execution
3. Set up S3 bucket with appropriate permissions
4. Create DynamoDB table with required schema
5. Deploy Lambda functions with Node.js runtime
6. Configure API Gateway endpoints with CORS
7. Set up CloudWatch logging and monitoring

## Sample Data Testing

Test the system using documents from:
`~/ea_sample_docs/idp_docs`

Supported formats: JPEG, PNG, PDF

## Cost Optimization

- Lambda: Pay per execution model
- S3: Lifecycle policies for document retention
- DynamoDB: On-demand billing for variable load
- Bedrock: Token-based pricing for AI processing
- API Gateway: Request-based pricing

---

**Generated on:** 2025-11-28
**Architecture Version:** 1.0
**Technology Stack:** React, AWS Lambda, API Gateway, S3, DynamoDB, Amazon Bedrock (Claude 4)

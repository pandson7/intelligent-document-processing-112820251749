# Intelligent Document Processing System

A comprehensive AWS-based solution for intelligent document processing using AI/ML services for document analysis, text extraction, and data processing.

## 🏗️ Architecture Overview

This system provides an end-to-end document processing pipeline that can:
- Accept document uploads through a web interface
- Process documents using AWS AI/ML services (Textract, Comprehend)
- Store processed data in DynamoDB
- Provide real-time processing status updates
- Generate insights and analytics from processed documents

## 📁 Project Structure

```
intelligent-document-processing-112820251749/
├── cdk-app/                    # AWS CDK Infrastructure as Code
│   ├── lib/                    # CDK stack definitions
│   ├── bin/                    # CDK app entry point
│   └── test/                   # Infrastructure tests
├── frontend/                   # React web application
│   ├── src/                    # React source code
│   ├── public/                 # Static assets
│   └── package.json            # Frontend dependencies
├── generated-diagrams/         # Architecture diagrams
├── specs/                      # Project specifications
├── pricing/                    # Cost analysis
├── qr-code/                    # QR code for project access
├── jira-stories-summary.md     # Development stories
└── PROJECT_SUMMARY.md          # Detailed project summary
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### 1. Deploy Infrastructure

```bash
cd cdk-app
npm install
npm run build
cdk bootstrap  # First time only
cdk deploy
```

### 2. Launch Frontend

```bash
cd frontend
npm install
npm start
```

The application will be available at `http://localhost:3000`

## 🏛️ AWS Architecture

### Core Services Used

- **Amazon S3**: Document storage and static website hosting
- **AWS Lambda**: Serverless processing functions
- **Amazon DynamoDB**: NoSQL database for metadata and results
- **Amazon Textract**: Document text and data extraction
- **Amazon Comprehend**: Natural language processing and sentiment analysis
- **Amazon API Gateway**: RESTful API endpoints
- **AWS Step Functions**: Workflow orchestration
- **Amazon CloudWatch**: Monitoring and logging
- **AWS IAM**: Security and access management

### Processing Flow

1. **Upload**: Documents uploaded via web interface to S3
2. **Trigger**: S3 event triggers Step Functions workflow
3. **Extract**: Textract extracts text and structured data
4. **Analyze**: Comprehend performs NLP analysis
5. **Store**: Results stored in DynamoDB
6. **Notify**: Real-time updates via WebSocket API

## 📊 Features

### Document Processing
- Support for PDF, PNG, JPEG, and TIFF formats
- Text extraction with confidence scores
- Table and form data extraction
- Multi-page document handling

### AI Analysis
- Entity recognition (people, places, organizations)
- Sentiment analysis
- Key phrase extraction
- Language detection

### Web Interface
- Drag-and-drop file upload
- Real-time processing status
- Results visualization
- Download processed data
- Responsive design with Tailwind CSS

### Monitoring & Analytics
- Processing metrics and dashboards
- Error tracking and alerting
- Cost optimization insights
- Performance monitoring

## 💰 Cost Analysis

Estimated monthly costs for moderate usage (1000 documents/month):

- **Textract**: ~$15-30
- **Comprehend**: ~$10-20
- **Lambda**: ~$5-10
- **DynamoDB**: ~$5-15
- **S3**: ~$2-5
- **API Gateway**: ~$3-8
- **Other services**: ~$5-10

**Total estimated**: $45-98/month

See `pricing/cost_analysis_report.md` for detailed cost breakdown.

## 🔧 Configuration

### Environment Variables

The CDK stack uses these configuration options:

```typescript
// In cdk-app/lib/cdk-app-stack.ts
const config = {
  documentBucket: 'idp-documents-bucket',
  tableName: 'DocumentProcessingTable',
  apiName: 'DocumentProcessingAPI'
};
```

### Frontend Configuration

```javascript
// In frontend/src/config.js
const config = {
  apiEndpoint: process.env.REACT_APP_API_ENDPOINT,
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
};
```

## 🧪 Testing

### Infrastructure Tests

```bash
cd cdk-app
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📈 Monitoring

The system includes comprehensive monitoring:

- **CloudWatch Dashboards**: Real-time metrics
- **Alarms**: Automated alerting for errors/performance
- **X-Ray Tracing**: Distributed request tracing
- **Custom Metrics**: Business-specific KPIs

## 🔒 Security

Security features implemented:

- **IAM Roles**: Least privilege access
- **VPC**: Network isolation where applicable
- **Encryption**: At-rest and in-transit encryption
- **API Authentication**: Secure API access
- **Input Validation**: Comprehensive input sanitization

## 🚀 Deployment

### Production Deployment

1. **Configure Environment**:
   ```bash
   export AWS_PROFILE=production
   export CDK_DEFAULT_ACCOUNT=123456789012
   export CDK_DEFAULT_REGION=us-east-1
   ```

2. **Deploy Infrastructure**:
   ```bash
   cd cdk-app
   cdk deploy --profile production
   ```

3. **Build and Deploy Frontend**:
   ```bash
   cd frontend
   npm run build
   aws s3 sync build/ s3://your-frontend-bucket --profile production
   ```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Automated testing
- Infrastructure deployment
- Frontend deployment
- Security scanning

## 📚 Documentation

- [Architecture Diagrams](generated-diagrams/README.md)
- [API Documentation](specs/design.md)
- [Development Stories](jira-stories-summary.md)
- [Cost Analysis](pricing/cost_analysis_report.md)
- [Project Requirements](specs/requirements.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Check the documentation in the `specs/` directory
- Review the architecture diagrams in `generated-diagrams/`

## 🔄 Version History

- **v1.0.0** - Initial release with core document processing features
- **v1.1.0** - Added real-time processing status updates
- **v1.2.0** - Enhanced AI analysis capabilities
- **v2.0.0** - Complete UI redesign with improved UX

---

**Built with ❤️ using AWS CDK, React, and modern cloud-native technologies**

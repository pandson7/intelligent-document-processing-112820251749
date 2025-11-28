import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class IntelligentDocumentProcessingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = '112820251749';

    // S3 Bucket for document storage
    const documentBucket = new s3.Bucket(this, `DocumentBucket${suffix}`, {
      bucketName: `intelligent-document-processing-${suffix}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 3000
      }]
    });

    // DynamoDB table for processing results
    const processingTable = new dynamodb.Table(this, `ProcessingTable${suffix}`, {
      tableName: `DocumentProcessing${suffix}`,
      partitionKey: { name: 'documentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Enable auto scaling
    processingTable.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 10
    });
    processingTable.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 10
    });

    // IAM role for Lambda functions
    const lambdaRole = new iam.Role(this, `LambdaRole${suffix}`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['bedrock:InvokeModel'],
              resources: [
                `arn:aws:bedrock:us-east-1:${this.account}:inference-profile/global.anthropic.claude-sonnet-4-20250514-v1:0`,
                `arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0`
              ]
            })
          ]
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [`${documentBucket.bucketArn}/*`]
            })
          ]
        }),
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:Scan'],
              resources: [processingTable.tableArn]
            })
          ]
        }),
        LambdaInvoke: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [`arn:aws:lambda:${this.region}:${this.account}:function:*${suffix}`]
            })
          ]
        })
      }
    });

    // Lambda function for document upload
    const uploadFunction = new lambda.Function(this, `UploadFunction${suffix}`, {
      functionName: `DocumentUpload${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      role: lambdaRole,
      code: lambda.Code.fromInline(`
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { randomUUID } = require('crypto');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const { fileName, fileContent, fileType } = body;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and PDF are supported.' })
      };
    }

    const documentId = randomUUID();
    const s3Key = \`documents/\${documentId}/\${fileName}\`;
    
    // Convert base64 to buffer
    const buffer = Buffer.from(fileContent, 'base64');
    
    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: fileType
    }));

    // Store in DynamoDB
    await dynamoClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        documentId,
        fileName,
        fileType,
        uploadTimestamp: new Date().toISOString(),
        status: 'UPLOADED',
        s3Key
      }
    }));

    // Trigger OCR processing
    await lambdaClient.send(new InvokeCommand({
      FunctionName: \`DocumentOCR${suffix}\`,
      InvocationType: 'Event',
      Payload: JSON.stringify({ documentId, s3Key, fileType })
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ documentId, message: 'Document uploaded successfully' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
      `),
      environment: {
        BUCKET_NAME: documentBucket.bucketName,
        TABLE_NAME: processingTable.tableName
      },
      timeout: cdk.Duration.seconds(30)
    });

    // Lambda function for OCR processing
    const ocrFunction = new lambda.Function(this, `OCRFunction${suffix}`, {
      functionName: `DocumentOCR${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      role: lambdaRole,
      code: lambda.Code.fromInline(`
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { documentId, s3Key, fileType } = event;
    
    // Get document from S3
    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: s3Key
    }));
    
    const documentBytes = await s3Response.Body.transformToByteArray();
    
    // Prepare content for Bedrock
    let content;
    if (fileType === 'application/pdf') {
      content = [{
        type: 'document',
        source: {
          type: 'base64',
          media_type: fileType,
          data: Buffer.from(documentBytes).toString('base64')
        }
      }, {
        type: 'text',
        text: 'Extract all text and data from this document and format it as JSON key-value pairs. Include all visible text, numbers, dates, and structured information.'
      }];
    } else {
      content = [{
        type: 'image',
        source: {
          type: 'base64',
          media_type: fileType,
          data: Buffer.from(documentBytes).toString('base64')
        }
      }, {
        type: 'text',
        text: 'Extract all text and data from this image and format it as JSON key-value pairs. Include all visible text, numbers, dates, and structured information.'
      }];
    }

    // Call Bedrock Claude 4
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'global.anthropic.claude-sonnet-4-20250514-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: content
        }]
      })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    let ocrResults = responseBody.content[0].text;
    
    // Extract JSON from markdown if wrapped
    const jsonMatch = ocrResults.match(/\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`/);
    if (jsonMatch) {
      ocrResults = jsonMatch[1];
    }

    // Update DynamoDB
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { documentId },
      UpdateExpression: 'SET ocrResults = :ocr, #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':ocr': ocrResults,
        ':status': 'OCR_COMPLETE'
      }
    }));

    // Trigger classification
    await lambdaClient.send(new InvokeCommand({
      FunctionName: \`DocumentClassification${suffix}\`,
      InvocationType: 'Event',
      Payload: JSON.stringify({ documentId, ocrResults })
    }));

    return { statusCode: 200, body: 'OCR processing complete' };
  } catch (error) {
    console.error('OCR Error:', error);
    
    // Update status to failed
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { documentId: event.documentId },
      UpdateExpression: 'SET #status = :status, errorMessage = :error',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'FAILED',
        ':error': error.message
      }
    }));
    
    throw error;
  }
};
      `),
      environment: {
        BUCKET_NAME: documentBucket.bucketName,
        TABLE_NAME: processingTable.tableName
      },
      timeout: cdk.Duration.seconds(60)
    });

    // Lambda function for document classification
    const classificationFunction = new lambda.Function(this, `ClassificationFunction${suffix}`, {
      functionName: `DocumentClassification${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      role: lambdaRole,
      code: lambda.Code.fromInline(`
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  try {
    const { documentId, ocrResults } = event;
    
    const prompt = \`Based on the following extracted text from a document, classify it into one of these categories:
- Dietary Supplement
- Stationery  
- Kitchen Supplies
- Medicine
- Driver License
- Invoice
- W2
- Other

Document text: \${ocrResults}

Respond with only the category name and a confidence score (0-100). Format: "Category: [category], Confidence: [score]"\`;

    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'global.anthropic.claude-sonnet-4-20250514-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: prompt }]
        }]
      })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const classificationText = responseBody.content[0].text;
    
    // Parse classification result
    const categoryMatch = classificationText.match(/Category: ([^,]+)/);
    const confidenceMatch = classificationText.match(/Confidence: (\\d+)/);
    
    const classification = categoryMatch ? categoryMatch[1].trim() : 'Other';
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;

    // Update DynamoDB
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { documentId },
      UpdateExpression: 'SET classification = :class, classificationConfidence = :conf, #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':class': classification,
        ':conf': confidence,
        ':status': 'CLASSIFICATION_COMPLETE'
      }
    }));

    // Trigger summarization
    await lambdaClient.send(new InvokeCommand({
      FunctionName: \`DocumentSummarization${suffix}\`,
      InvocationType: 'Event',
      Payload: JSON.stringify({ documentId, ocrResults, classification })
    }));

    return { statusCode: 200, body: 'Classification complete' };
  } catch (error) {
    console.error('Classification Error:', error);
    throw error;
  }
};
      `),
      environment: {
        TABLE_NAME: processingTable.tableName
      },
      timeout: cdk.Duration.seconds(30)
    });

    // Lambda function for document summarization
    const summarizationFunction = new lambda.Function(this, `SummarizationFunction${suffix}`, {
      functionName: `DocumentSummarization${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      role: lambdaRole,
      code: lambda.Code.fromInline(`
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

exports.handler = async (event) => {
  try {
    const { documentId, ocrResults, classification } = event;
    
    const prompt = \`Create a concise summary of this \${classification} document based on the extracted text. Focus on key information, important details, and main points. Keep the summary between 200-300 words.

Document text: \${ocrResults}

Summary:\`;

    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: 'global.anthropic.claude-sonnet-4-20250514-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: prompt }]
        }]
      })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const summary = responseBody.content[0].text;

    // Update DynamoDB with final results
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { documentId },
      UpdateExpression: 'SET summary = :summary, #status = :status, processingTimestamp = :timestamp',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':summary': summary,
        ':status': 'COMPLETED',
        ':timestamp': new Date().toISOString()
      }
    }));

    return { statusCode: 200, body: 'Summarization complete' };
  } catch (error) {
    console.error('Summarization Error:', error);
    throw error;
  }
};
      `),
      environment: {
        TABLE_NAME: processingTable.tableName
      },
      timeout: cdk.Duration.seconds(30)
    });

    // Lambda function for retrieving results
    const resultsFunction = new lambda.Function(this, `ResultsFunction${suffix}`, {
      functionName: `DocumentResults${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      role: lambdaRole,
      code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.pathParameters && event.pathParameters.id) {
      // Get specific document
      const documentId = event.pathParameters.id;
      const result = await dynamoClient.send(new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { documentId }
      }));

      if (!result.Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Document not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
      };
    } else {
      // List all documents
      const result = await dynamoClient.send(new ScanCommand({
        TableName: process.env.TABLE_NAME
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ documents: result.Items })
      };
    }
  } catch (error) {
    console.error('Results Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
      `),
      environment: {
        TABLE_NAME: processingTable.tableName
      },
      timeout: cdk.Duration.seconds(30)
    });

    // API Gateway
    const api = new apigateway.RestApi(this, `DocumentProcessingAPI${suffix}`, {
      restApiName: `DocumentProcessingAPI${suffix}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }
    });

    // API Gateway resources and methods
    const documentsResource = api.root.addResource('documents');
    
    // POST /documents - Upload document
    documentsResource.addMethod('POST', new apigateway.LambdaIntegration(uploadFunction));
    
    // GET /documents - List all documents
    documentsResource.addMethod('GET', new apigateway.LambdaIntegration(resultsFunction));
    
    // GET /documents/{id} - Get specific document
    const documentResource = documentsResource.addResource('{id}');
    documentResource.addMethod('GET', new apigateway.LambdaIntegration(resultsFunction));

    // Output the API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL'
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: documentBucket.bucketName,
      description: 'S3 Bucket Name'
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: processingTable.tableName,
      description: 'DynamoDB Table Name'
    });
  }
}

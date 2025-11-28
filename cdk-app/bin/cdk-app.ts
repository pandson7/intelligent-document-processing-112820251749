#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { IntelligentDocumentProcessingStack } from '../lib/cdk-app-stack';

const app = new cdk.App();
new IntelligentDocumentProcessingStack(app, 'IntelligentDocumentProcessingStack112820251749', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});

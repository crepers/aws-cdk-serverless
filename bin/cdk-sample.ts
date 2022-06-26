#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkSampleStack } from '../lib/cdk-sample-stack';
import { CdkSolutionsConstructsStack } from '../lib/solutions-construct';
import { VpcSampleStack } from '../lib/vpc-stack.';
import { ServerlessStack } from '../lib/serverless-stack';
import { CognitoKakaoStack } from '../lib/kakao-stack';

const app = new cdk.App();

const kakao = new CognitoKakaoStack(app, 'CognitoKakaoStack');

const serverless = new ServerlessStack(app, 'AuroraServerlessStack', {
  userPool: kakao.userPool,
  userPoolClient: kakao.userPoolClient
});
serverless.addDependency(kakao);




// for test
// new CdkSampleStack(app, 'CdkSampleStack');
// new CdkSolutionsConstructsStack(app, 'CdkSolutionsConstructsStack');
// new VpcSampleStack(app, 'VpcSampleStack');
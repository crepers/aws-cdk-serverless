#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkSolutionsConstructsStack } from './stack/solutions-construct';
import { ServerlessStack } from './stack/serverless-stack';
import { CognitoKakaoStack } from './stack/kakao-stack';
import { RdsStack } from './stack/rds-stack';
import { VpcStack } from './stack/vpc-stack';
import { AppContext } from '../lib/base/app-context';
import { AuroraServerlessV2Stack } from '../lib/constructs/aurora-serverless-v2';

const appContext = new AppContext({
  projectPrefix: 'envtest'
});

if(appContext.appConfig) {
  const vpcStack = new VpcStack(appContext, 'VpcStack', {vpcName: 'sample'});
  
  const kakao = new CognitoKakaoStack(appContext, 'CognitoKakaoStack');
  
  const serverless = new ServerlessStack(appContext, 'AuroraServerlessStack', {
    userPool: kakao.userPool,
    userPoolClient: kakao.userPoolClient,
    vpc: vpcStack.vpc,
  });
  serverless.addDependency(vpcStack);
  serverless.addDependency(kakao);
  
  const auroraV2 = new AuroraServerlessV2Stack(appContext.cdkApp, 'Serverless-v2', {
    vpc: vpcStack.vpc,
    defaultDatabaseName: 'AuroraServerlessv2',
    clusterName: 'v2cluster',
    credentials:{
      username: 'admin',
      password: 'adminadmin'
    },
    backendServerSG: vpcStack.backendServerSG,
    dbserverSG : vpcStack.dbserverSG,
  })
  
  // const rdsAurora = new RdsStack(appContext, 'RdsAuroraStack', {
  //   vpc: vpcStack.vpc
  // });
} else {
  console.warn("App config is undefined. Please check the configuration file.");
}
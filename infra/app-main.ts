#!/usr/bin/env node
import { ServerlessStack } from './stack/serverless-stack';
import { CognitoKakaoStack } from './stack/kakao-stack';
import { VpcStack } from './stack/vpc-stack';
import { AppContext } from '../lib/base/app-context';
// import { RdsProxyStack } from './stack/rds-proxy-stack';
import { AuroraServerlessV2Stack } from './stack/aurora-serverless-v2';
import { WafStack } from './stack/waf-stack';

const appContext = new AppContext({
  projectPrefix: 'envtest'
});

if(appContext.appConfig) {
  const kakao = new CognitoKakaoStack(appContext, 'CognitoKakaoStack');
  const vpcStack = new VpcStack(appContext, 'VpcStack', {vpcName: 'sample'});
  
  const auroraV2 = new AuroraServerlessV2Stack(appContext, 'Serverless-v2', {
    vpc: vpcStack.vpc,
    defaultDatabaseName: 'AuroraServerlessv2',
    clusterName: 'v2cluster',
    credentials:{
      username: 'admin',
    },
    backendServerSG: vpcStack.backendServerSG,
    dbserverSG : vpcStack.dbserverSG,
  });
  
  auroraV2.addDependency(vpcStack);
  
  const serverless = new ServerlessStack(appContext, 'AuroraServerlessStack', {
    userPool: kakao.userPool,
    userPoolClient: kakao.userPoolClient,
    vpc: vpcStack.vpc,
    backendServerSG: vpcStack.backendServerSG,
    cluster: auroraV2.cluster,
  });
  
  serverless.addDependency(vpcStack);
  serverless.addDependency(auroraV2);
  serverless.addDependency(kakao);
  
  const waf = new WafStack(appContext, 'WafStack', {
    apiGwArn: serverless.apiGwArn
  });
  
  // const rdsProxy = new RdsProxyStack(appContext, 'RdsProxy', {
  //   vpc: vpcStack.vpc,
  //   backendServerSG: vpcStack.backendServerSG,
  //   dbserverSG : vpcStack.dbserverSG,
  //   clusterName: 'v2cluster',
  //   cluster: auroraV2.cluster,
  //   databaseCredentialsSecret: auroraV2.databaseCredentialsSecret
  // });
  
  // rdsProxy.addDependency(vpcStack);
  // rdsProxy.addDependency(auroraV2);
  // rdsProxy.addDependency(serverless);
  
  // const rdsAurora = new RdsStack(appContext, 'RdsAuroraStack', {
  //   vpc: vpcStack.vpc
  // });
} else {
  console.warn("App config is undefined. Please check the configuration file.");
}
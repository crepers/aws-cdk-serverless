import { Duration, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { VpcConstruct } from './base/vpc-construct';
import { AuroraServerlessConstruct } from './constructs/aurora-serverless';

interface Props extends StackProps {
  userPool: cognito.IUserPool
  userPoolClient: cognito.IUserPoolClient
}

export class ServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    // cognito
    const auth = new apigateway.CognitoUserPoolsAuthorizer(this, 'kakaoAuthorizer', {
      cognitoUserPools: [props.userPool]
    });
    
    // VPC
    const vpcConstruct = new VpcConstruct(this, 'rdsserverlessvpc', {
       vpcName: 'rdsserverlessvpc' 
    });
    
    // Aurora Serverless
    const clusterConstruct = new AuroraServerlessConstruct(this, 'ServerlessCluster', {
      clusterName: 'ServerlessCluster',
      vpc: vpcConstruct.vpc
    })
    
    const cluster = clusterConstruct.cluster;
    
    /**
     * Lambda
     */
    const lambdaRole = new iam.Role(this, 'AuroraServerlessUserServiceLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSDataFullAccess'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
        ]
    });
    
    const handler = new lambda.Function(this, "ServiceHandler", {
      role: lambdaRole,
      runtime: lambda.Runtime.NODEJS_16_X, // So we can use async in widget.js
      code: lambda.Code.fromAsset("functions/user-services"),
      handler: 'user.handler',
      environment: {
        TABLE: cluster.clusterArn,
        TABLESECRET: cluster.secret!.secretArn,
        DATABASE: "userservice"
      }
    });
    
    /**
     * API Gateway
     */
    const api = new apigateway.RestApi(this, "services-api", {
      restApiName: "Member Service",
      description: "This service serves.",
      // deploy: false
      deployOptions: {
        stageName: 'v1',
      },
      
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowCredentials: true,
        allowOrigins: ['http://localhost:3000'],
      }
    });

    const getRootIntegration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": 200 }' }
    });

    api.root.addMethod("GET", getRootIntegration); // GET /

    const userService = api.root.addResource("members")
    const postIntegration = new apigateway.LambdaIntegration(handler);
    userService.addMethod("POST", postIntegration, {
      authorizer: auth,
      authorizationType: apigateway.AuthorizationType.COGNITO
    }); // POST
    
    let memberResource = userService.addResource("{id}");
    const getIntegration = new apigateway.LambdaIntegration(handler);
    memberResource.addMethod("GET", getIntegration, {
      authorizer: auth,
      authorizationType: apigateway.AuthorizationType.COGNITO
    }); // GET/{id}
    
    // API Gateway Deployment
    // Then create an explicit Deployment construct
    // const deployment  = new apigateway.Deployment(this, 'my_deployment', { api });

    // And different stages
    // const [devStage, testStage, prodStage] = ['dev', 'test', 'prod'].map(item => 
    //   new apigateway.Stage(this, `${item}_stage`, { deployment, stageName: item }));

    // api.deploymentStage = prodStage
    
     //  create an Output for the API URL
    new CfnOutput(this, 'apiUrl', {value: api.url});
  }
}
import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { AuroraServerlessConstruct } from '../../lib/constructs/aurora-serverless';
import { AppContext } from '../../lib/base/app-context';
import { DatabaseCluster } from 'aws-cdk-lib/aws-rds';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';


interface Props extends StackProps {
  userPool: cognito.IUserPool,
  userPoolClient: cognito.IUserPoolClient,
  vpc: ec2.IVpc,
  backendServerSG: ec2.ISecurityGroup,
  cluster: DatabaseCluster,
}

export class ServerlessStack extends Stack {
  constructor(appContext: AppContext, id: string, props: Props) {
    super(appContext.cdkApp, id, props);

    // cognito
    const auth = new apigateway.CognitoUserPoolsAuthorizer(this, 'kakaoAuthorizer', {
      cognitoUserPools: [props.userPool]
    });
    
    // Aurora Serverless V1
    // const clusterConstruct = new AuroraServerlessConstruct(this, 'ServerlessCluster', {
    //   clusterName: 'ServerlessCluster',
    //   vpc: props.vpc
    // })
    // const cluster = clusterConstruct.cluster;
    
    /**
     * Lambda
     */
    const lambdaRole = new iam.Role(this, 'AuroraServerlessUserServiceLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRDSDataFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });
    
    // lambdaRole.addToPolicy(new PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   sid: 'AllowEc2',
    //   resources: ['*'],
    //   actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface']
    // }));
    const handler = new NodejsFunction(this, "ServiceHandler", {
      role: lambdaRole,
      runtime: lambda.Runtime.NODEJS_16_X,
      // code: lambda.Code.fromAsset("app/functions/user-services-v2"),
      // entry: "/app/functions/user-services-v2",
      entry : path.resolve(__dirname, '..', '..', 'app', 'functions', 'user-services-v2', 'user-v2.js'),
      handler: 'handler',
      // bundling: {
      //   nodeModules: ['mysql'],
      // },
      environment: {
        // v2
        HOSTNAME: props.cluster.clusterEndpoint.hostname,
        SECRET: props.cluster.secret ? props.cluster.secret.secretName : '',

        // V1 기준
        // TABLE: cluster.clusterArn,
        // TABLE: 'table',
        // TABLESECRET: cluster.secret!.secretArn,
        // DATABASE: appContext.appConfig.lambda.database, //"userservice"
      },
      // place lambda in the VPC
      vpc: props.vpc,
      // place lambda in Private Subnets
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
      },
      securityGroups: [props.backendServerSG],
      timeout: Duration.minutes(5),
      memorySize: 256,
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
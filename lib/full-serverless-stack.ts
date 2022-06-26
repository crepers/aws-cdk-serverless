import { Duration, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { VpcConstruct } from './base/vpc-construct';

export class ServerlessStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // const instanceIdentifier = 'mysql-01'
    // const credsSecretName = `/${id}/rds/creds/${instanceIdentifier}`.toLowerCase()
    // const creds = new DatabaseSecret(this, 'MysqlRdsCredentials', {
    //   secretName: credsSecretName,
    //   username: 'admin'
    // })

    // const databaseUsername = 'adminuser';
    // const databaseCredentialsSecret = new secretsManager.Secret(this, 'DBCredentialsSecret', {
    //   secretName: `aurora-serverless-credentials`,
    //   generateSecretString: {
    //     secretStringTemplate: JSON.stringify({
    //       username: databaseUsername,
    //     }),
    //     excludePunctuation: true,
    //     includeSpace: false,
    //     generateStringKey: 'password'
    //   }
    // });

    // new ssm.StringParameter(this, 'DBCredentialsArn', {
    //   parameterName: `aurora-serverless-credentials-arn`,
    //   stringValue: databaseCredentialsSecret.secretArn,
    // });

    // const dbConfig = {
    //   dbClusterIdentifier: `main-aurora-serverless-cluster`,
    //   engineMode: 'serverless',
    //   engine: 'aurora-mysql',
    //   engineVersion: '3.02.0', //Serverless v2
    //   enableHttpEndpoint: true,
    //   databaseName: 'main',
    //   masterUsername: 'adminuser',
    //   masterUserPassword: databaseCredentialsSecret.secretValueFromJson('password').toString(),
    //   backupRetentionPeriod: 1,
    //   finalSnapshotIdentifier: `main-aurora-serverless-snapshot`,
    //   scalingConfiguration: {
    //     autoPause: true,
    //     maxCapacity: 4,
    //     minCapacity: 2,
    //     secondsUntilAutoPause: 3600,
    //   }
    // };

    const vpcConstruct = new VpcConstruct(this, 'rdsserverlessvpc', {
       vpcName: 'rdsserverlessvpc' 
    });
    
    // const cluster = new rds.DatabaseCluster(this, 'cluster-name', {
    //   clusterIdentifier: 'cluster-name',
    //   engine: rds.DatabaseClusterEngine.auroraMysql({
    //     version: rds.AuroraMysqlEngineVersion.of('8.0.mysql_aurora.3.02.0'), // The new minor version of Database Engine.
    //   }),
    //   credentials: rds.Credentials.fromGeneratedSecret('admin'),
    //   instanceProps: {
    //   instanceType: 'serverless'
    //   },
    //   instances: 1,
    // });

    // const rdsCluster = new rds.CfnDBCluster(this, 'DBCluster', dbConfig);
    // const cluster = new rds.ServerlessCluster(this, 'AnotherCluster', {
    //   engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
    //   vpc: vpcConstruct.vpc, // this parameter is optional for serverless Clusters
    //   enableDataApi: true, // Optional - will be automatically set if you call grantDataApiAccess()
    // });
    
    const cluster = new rds.ServerlessCluster(this, 'ServerlessCluster', {
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      // parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, 'ParameterGroup', 'default.aurora-postgresql10'),
      vpc: vpcConstruct.vpc,
      enableDataApi: true, // Optional - will be automatically set if you call grantDataApiAccess()
      // scaling: {
      //   autoPause: Duration.minutes(10), // default is to pause after 5 minutes of idle time
      //   minCapacity: rds.AuroraCapacityUnit.ACU_8, // default is 2 Aurora capacity units (ACUs)
      //   maxCapacity: rds.AuroraCapacityUnit.ACU_32, // default is 16 Aurora capacity units (ACUs)
      // }
    }); 
    
    // const dbClusterArn = `arn:aws:rds:${this.region}:${this.account}:cluster:${rdsCluster.ref}`;
    
    new ssm.StringParameter(this, 'DBResourceArn', {
      parameterName: `aurora-serverless-resource-arn`,
      stringValue: cluster.clusterArn,
    });
    
    
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
      code: lambda.Code.fromAsset("lambda"),
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
    userService.addMethod("POST", postIntegration); // POST
    
    let memberResource = userService.addResource("{id}");
    const getIntegration = new apigateway.LambdaIntegration(handler);
    memberResource.addMethod("GET", getIntegration); // GET/{id}
    
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
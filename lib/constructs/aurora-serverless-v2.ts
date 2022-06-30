import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {Credentials} from "aws-cdk-lib/aws-rds";
import * as sm from "aws-cdk-lib/aws-secretsmanager";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import { custom_resources as cr } from "aws-cdk-lib";
import {CfnResource, SecretValue, Stack, StackProps, Duration} from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface AuroraServerlessV2Props extends StackProps{
  clusterName: string,
  defaultDatabaseName: string,
  vpc: ec2.IVpc,
  credentials:{
    username: string,
    password: string
  }
}

export class AuroraServerlessV2Stack extends Stack {
    public readonly cluster: rds.DatabaseCluster;
    public readonly ssm: ssm.StringParameter;
    constructor(scope: Construct, id: string, props: AuroraServerlessV2Props) {
        super(scope, id, props);

        enum ServerlessInstanceType {
            SERVERLESS = "serverless",
        }

        type CustomInstanceType = ServerlessInstanceType | ec2.InstanceType;

        const CustomInstanceType = {
            ...ServerlessInstanceType,
            ...ec2.InstanceType,
        };

        const dbClusterInstanceCount: number = 1;

        const databaseCredentialsSecret = new sm.Secret(this, `${props.clusterName}-DBCredentialsSecret`, {
          secretName: `${props.clusterName}-credentials`,
          generateSecretString: {
            secretStringTemplate: JSON.stringify({
              username: `${props.credentials.username}`,
            }),
            excludePunctuation: true,
            includeSpace: false,
            generateStringKey: 'password'
          }
        });    
        
        this.cluster = new rds.DatabaseCluster(this, props.clusterName, { // "AuroraServerlessv2", {
            engine: rds.DatabaseClusterEngine.auroraMysql({
                version: rds.AuroraMysqlEngineVersion.VER_3_02_0,
            }),
            instances: dbClusterInstanceCount,
            defaultDatabaseName: props.defaultDatabaseName ,//'myDefaultDbName',
            instanceProps: {
                vpc: props.vpc,
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                instanceType: CustomInstanceType.SERVERLESS as unknown as ec2.InstanceType,
                autoMinorVersionUpgrade: true,
                allowMajorVersionUpgrade: false,
                publiclyAccessible: true,
            },
            monitoringInterval: Duration.seconds(10),
            //monitoringRole: optional, creates a new IAM role by default
            cloudwatchLogsExports: ['error', 'general', 'slowquery', 'audit'], // Export all available MySQL-based logs
            cloudwatchLogsRetention: RetentionDays.THREE_MONTHS, // Optional - default is to never expire logs
            //todo: use secret manager
            // credentials: Credentials.fromPassword(props.credentials.username, SecretValue.unsafePlainText(props.credentials.password)),
            credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
            backup: {
                retention: Duration.days(7),
                preferredWindow: '01:00-02:00'
            },
            preferredMaintenanceWindow:  'Mon:00:15-Mon:00:45',
        });

        this.cluster.connections.allowDefaultPortFromAnyIpv4('Open to the world');

        const serverlessV2ScalingConfiguration = {
            MinCapacity: 0.5,
            MaxCapacity: 16,
        };

        const dbScalingConfigure = new cr.AwsCustomResource(
            this,
            "DbScalingConfigure",
            {
                onCreate: {
                    service: "RDS",
                    action: "modifyDBCluster",
                    parameters: {
                        DBClusterIdentifier: this.cluster.clusterIdentifier,
                        ServerlessV2ScalingConfiguration: serverlessV2ScalingConfiguration,
                    },
                    physicalResourceId: cr.PhysicalResourceId.of(
                        this.cluster.clusterIdentifier
                    ),
                },
                onUpdate: {
                    service: "RDS",
                    action: "modifyDBCluster",
                    parameters: {
                        DBClusterIdentifier: this.cluster.clusterIdentifier,
                        ServerlessV2ScalingConfiguration: serverlessV2ScalingConfiguration,
                    },
                    physicalResourceId: cr.PhysicalResourceId.of(
                        this.cluster.clusterIdentifier
                    ),
                },
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
                    resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
                }),
            }
        );

        const cfnDbCluster = this.cluster.node.defaultChild as rds.CfnDBCluster;
        const dbScalingConfigureTarget = dbScalingConfigure.node.findChild(
            "Resource"
        ).node.defaultChild as CfnResource;

        cfnDbCluster.addPropertyOverride("EngineMode", "provisioned");
        dbScalingConfigure.node.addDependency(cfnDbCluster);

        for (let i = 1 ; i <= dbClusterInstanceCount ; i++) {
            (this.cluster.node.findChild(`Instance${i}`) as rds.CfnDBInstance).addDependsOn(dbScalingConfigureTarget)
        }
        
        this.ssm = new ssm.StringParameter(this, `DBResourceArn-${props.clusterName}`, {
          parameterName: `aurora-serverless-${props.clusterName}-endpoint`,
          stringValue: this.cluster.clusterEndpoint.hostname,
        });
    }
}
// import { Construct } from 'constructs';
// import * as rds from 'aws-cdk-lib/aws-rds';
// import * as ssm from 'aws-cdk-lib/aws-ssm';
// import * as ec2 from 'aws-cdk-lib/aws-ec2';
// import { Key } from 'aws-cdk-lib/aws-kms';
// import { Duration, Stack } from 'aws-cdk-lib';


// export interface AuroraServerlessV2Props {
//   clusterName: string,
//   vpc: ec2.IVpc,
// }

// export class AuroraServerlessV2Construct extends Stack {
//   public readonly vpc: ec2.IVpc;
//   public readonly cluster: rds.DatabaseCluster;
//   public readonly ssm: ssm.StringParameter;

//   constructor(scope: Construct, id: string, props: AuroraServerlessV2Props) {
//     super(scope, id);

//         this.cluster = new rds.DatabaseCluster(
//             this,
//             'ServerlessClusterV2',
//             {
//                 engine: rds.DatabaseClusterEngine.auroraMysql({
//                     version: rds.AuroraMysqlEngineVersion.of(
//                         '8.0.mysql_aurora.3.02.0'
//                     ), // The new minor version of Database Engine.
//                 }),
//                 storageEncrypted: true,
//                 iamAuthentication: true,
//                 parameterGroup: rds.ParameterGroup.fromParameterGroupName(
//                     this,
//                     'rdsClusterPrameterGroup',
//                     'default.aurora-mysql8.0'
//                 ),
//                 backup: {
//                   retention: Duration.days(7),
//                   preferredWindow: '08:00-09:00'
//                 },
//                 storageEncryptionKey: new Key(this, 'dbEncryptionKey'),
//                 instanceProps: {
//                     instanceType: 'serverless' as unknown as ec2.InstanceType,
//                         // CustomInstanceType.SERVERLESS as unknown as InstanceType,
//                     vpc: props.vpc,
//                     vpcSubnets: {
//                         subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
//                     },
//                 },
//             }
//         );
    
//       this.ssm = new ssm.StringParameter(this, `DBResourceArn-${props.clusterName}`, {
//         parameterName: `aurora-serverless-${props.clusterName}-endpoint`,
//         stringValue: this.cluster.clusterEndpoint.hostname,
//       });
    
//   }
// }
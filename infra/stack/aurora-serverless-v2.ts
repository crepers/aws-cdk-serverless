import { Construct } from "constructs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import {Credentials} from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import { custom_resources as cr } from "aws-cdk-lib";
import {CfnResource, SecretValue, Stack, StackProps, Duration} from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { AppContext } from "../../lib/base/app-context";

export interface AuroraServerlessV2Props extends StackProps{
  clusterName: string,
  defaultDatabaseName: string,
  vpc: ec2.IVpc,
  backendServerSG: ec2.ISecurityGroup,
  dbserverSG : ec2.ISecurityGroup,
  credentials:{
    username: string,
  }
}

export class AuroraServerlessV2Stack extends Stack {
    public readonly cluster: rds.DatabaseCluster;
    public readonly databaseCredentialsSecret: Secret;
    public readonly ssm: ssm.StringParameter;
    constructor(appContext: AppContext, id: string, props: AuroraServerlessV2Props) {
        super(appContext.cdkApp, id, props);

        enum ServerlessInstanceType {
            SERVERLESS = "serverless",
        }
        
        type CustomInstanceType = ServerlessInstanceType | ec2.InstanceType;

        const CustomInstanceType = {
            ...ServerlessInstanceType,
            ...ec2.InstanceType,
        };

        const dbClusterInstanceCount: number = 1;

        this.databaseCredentialsSecret = new Secret(this, `${props.clusterName}-DBCredentialsSecret`, {
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
                    // subnetType: ec2.SubnetType.PUBLIC,
                    subnetType: ec2.SubnetType.ISOLATED
                },
                instanceType: CustomInstanceType.SERVERLESS as unknown as ec2.InstanceType,
                autoMinorVersionUpgrade: true,
                allowMajorVersionUpgrade: false,
                // publiclyAccessible: true,
                securityGroups: [ props.dbserverSG ],
            },
            monitoringInterval: Duration.seconds(10),
            //monitoringRole: optional, creates a new IAM role by default
            cloudwatchLogsExports: ['error', 'general', 'slowquery', 'audit'], // Export all available MySQL-based logs
            cloudwatchLogsRetention: RetentionDays.THREE_MONTHS, // Optional - default is to never expire logs
            //todo: use secret manager
            // credentials: Credentials.fromPassword(props.credentials.username, SecretValue.unsafePlainText(props.credentials.password)),
            credentials: rds.Credentials.fromSecret(this.databaseCredentialsSecret),
            backup: {
                retention: Duration.days(7),
                preferredWindow: '01:00-02:00'
            },
            preferredMaintenanceWindow:  'Mon:00:15-Mon:00:45',
        });

        // // this.cluster.connections.allowDefaultPortFromAnyIpv4('Open to the world');
        
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
        
        // // Create an RDS Proxy
        // const proxy = this.cluster.addProxy(props.clusterName +'-proxy', {
        //     borrowTimeout: Duration.seconds(30),
        //     maxConnectionsPercent: 50,
        //     secrets: [databaseCredentialsSecret],
        //     debugLogging: true,
        //     vpc: props.vpc,
        //     securityGroups: [ props.dbserverSG ],
        // });
    }
}
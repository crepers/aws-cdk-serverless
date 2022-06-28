import { CfnOutput, Stack, Token, StackProps, Duration } from 'aws-cdk-lib/core'
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Credentials, DatabaseInstance, IInstanceEngine, DatabaseSecret, DatabaseProxy } from 'aws-cdk-lib/aws-rds'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';


export interface RdsProps {
  vpc: ec2.IVpc,
  securityGroup: ec2.SecurityGroup,
  clusterName: string,
  username: string,
  instanceType: ec2.InstanceType,
  databaseName: string,
  databaseEngine: IInstanceEngine,
}

export class RdsConstruct extends Construct {
  public readonly secret: Secret
  public readonly proxy: DatabaseProxy
  public readonly dbServer: DatabaseInstance
  
  constructor(scope: Construct, id: string, props: RdsProps) {
    super(scope, id)

    const instanceIdentifier = props.clusterName;//'mysql-01'
    const credsSecretName = `/${id}/rds/creds/${instanceIdentifier}`.toLowerCase();
    const creds = new DatabaseSecret(this, `${id}RdsCredentials`, {
      secretName: credsSecretName,
      username: props.username//'admin'
    })
    
    this.dbServer = new DatabaseInstance(this, `${id}RdsInstance`, {
      vpcSubnets: {
        onePerAz: true,
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      credentials: Credentials.fromSecret(creds),
      vpc: props.vpc,
      port: 3306,
      databaseName: props.databaseName, //'main',
      allocatedStorage: 20,
      instanceIdentifier,
      engine: props.databaseEngine,
      // DatabaseInstanceEngine.mysql({
      //   version: MysqlEngineVersion.VER_8_0
      // }),
      //instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.LARGE)
      instanceType: props.instanceType
    })
    
    this.proxy = this.dbServer.addProxy('RdsProxy', {
      secrets: [this.secret],
      vpc: props.vpc,
      debugLogging: true,
      borrowTimeout: Duration.seconds(30),
      securityGroups: [props.securityGroup],
    });
    
    // potentially allow connections to the RDS instance...
    // dbServer.connections.allowFrom ...
    /* eslint no-new: 0 */
    new CfnOutput(this, 'RdsInitFnResponse', {
      value: Token.asString(this.dbServer.instanceEndpoint)
    })
  }
}
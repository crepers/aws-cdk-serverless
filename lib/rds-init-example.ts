import { CfnOutput, Stack, Token, StackProps } from 'aws-cdk-lib/core'
import { Construct } from 'constructs';

import { InstanceClass, InstanceSize, InstanceType, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2'
import { Credentials, DatabaseInstance, DatabaseInstanceEngine, DatabaseSecret, MysqlEngineVersion } from 'aws-cdk-lib/aws-rds'
import { VpcConstruct } from './base/vpc-construct';

export class RdsInitStackExample extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const instanceIdentifier = 'mysql-01'
    const credsSecretName = `/${id}/rds/creds/${instanceIdentifier}`.toLowerCase()
    const creds = new DatabaseSecret(this, 'MysqlRdsCredentials', {
      secretName: credsSecretName,
      username: 'admin'
    })

    const vpcConstruct = new VpcConstruct(this, 'rdsvpc', {
       vpcName: 'rdsvpc' 
    });
      
    const dbServer = new DatabaseInstance(this, 'MysqlRdsInstance', {
      vpcSubnets: {
        onePerAz: true,
        subnetType: SubnetType.PRIVATE_ISOLATED
      },
      credentials: Credentials.fromSecret(creds),
      vpc: vpcConstruct.vpc,
      port: 3306,
      databaseName: 'main',
      allocatedStorage: 20,
      instanceIdentifier,
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_0
      }),
      instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.LARGE)
    })
    // potentially allow connections to the RDS instance...
    // dbServer.connections.allowFrom ...
    /* eslint no-new: 0 */
    new CfnOutput(this, 'RdsInitFnResponse', {
      value: Token.asString(dbServer.instanceEndpoint)
    })
  }
}
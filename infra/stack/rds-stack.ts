import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs';

import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { DatabaseProxy, DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { AuroraConstruct } from '../../lib/constructs/aurora-rds';
import { AppContext } from '../../lib/base/app-context';


interface RdsStackProps extends StackProps {
  vpc : ec2.IVpc,
  // clusterName: string,
  // username: string,
  // databaseName: string,
  // databaseEngine: IInstanceEngine,
}

export class RdsStack extends Stack {
  // public readonly secret: Secret
  // public readonly proxy: DatabaseProxy
  // public readonly dbServer: DatabaseInstance
  // public readonly securityGroup: SecurityGroup
  
  constructor(appContext: AppContext, id: string, props: RdsStackProps) {
    super(appContext.cdkApp, id, props)

    // create a security group for the EC2 instance
    // const ec2InstanceSG = new ec2.SecurityGroup(this, 'ec2-instance-sg', {
    //   vpc: props.vpc
    // });
    // 
    // this.dbServer = new RdsConstruct(this, 'rdsaurora', {
    //   vpc: props.vpc,
    //   securityGroup: ec2InstanceSG,
    //   clusterName: props.clusterName,//'aurora-sample',
    //   username: props.username,//'admin',
    //   instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.LARGE),
    //   databaseName: props.databaseName,//"userdb",
    //   databaseEngine: props.databaseEngine,
    //   // databaseEngine: DatabaseInstanceEngine.mysql({
    //   //   version: MysqlEngineVersion.VER_8_0
    //   // }),
    // }).dbServer;
    
    new AuroraConstruct(this, 'AuroraStack', {
      // env: { region: 'ap-northeast-2' },
      description:"Aurora Stack",
      vpcId: props.vpc.vpcId,
      subnetIds: props.vpc.selectSubnets({subnetType: ec2.SubnetType.ISOLATED}).subnetIds,
      dbName:"sampledb",
      engine:"mysql",
      auroraClusterUsername: "admin",
    });
  }
}
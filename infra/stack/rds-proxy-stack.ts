import { Stack, StackProps, Duration } from 'aws-cdk-lib'

import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from 'aws-cdk-lib/aws-ec2'

import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { AppContext } from '../../lib/base/app-context';

interface RdsProxyStackProps extends StackProps {
  vpc : ec2.IVpc,
  cluster: rds.DatabaseCluster;
  clusterName: string,
  databaseCredentialsSecret: Secret
  backendServerSG: ec2.ISecurityGroup,
  dbserverSG : ec2.ISecurityGroup,
}

export class RdsProxyStack extends Stack {
  public readonly proxy : rds.IDatabaseProxy;
  
  constructor(appContext: AppContext, id: string, props: RdsProxyStackProps) {
    super(appContext.cdkApp, id, props)

    // Create an RDS Proxy
    this.proxy = props.cluster.addProxy(props.clusterName +'-proxy', {
        borrowTimeout: Duration.seconds(30),
        maxConnectionsPercent: 50,
        secrets: [props.databaseCredentialsSecret],
        debugLogging: true,
        vpc: props.vpc,
        securityGroups: [ props.dbserverSG ],
    });
  }
}
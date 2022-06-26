import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface AuroraServerlessProps {
  clusterName: string,
  vpc: ec2.IVpc,
}

export class AuroraServerlessConstruct extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly cluster: rds.ServerlessCluster;
  public readonly ssm: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: AuroraServerlessProps) {
    super(scope, id);
    
    this.cluster = new rds.ServerlessCluster(this, props.clusterName, {
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      // parameterGroup: rds.ParameterGroup.fromParameterGroupName(this, 'ParameterGroup', 'default.aurora-postgresql10'),
      vpc: props.vpc,
      enableDataApi: true, // Optional - will be automatically set if you call grantDataApiAccess()
      // scaling: {
      //   autoPause: Duration.minutes(10), // default is to pause after 5 minutes of idle time
      //   minCapacity: rds.AuroraCapacityUnit.ACU_8, // default is 2 Aurora capacity units (ACUs)
      //   maxCapacity: rds.AuroraCapacityUnit.ACU_32, // default is 16 Aurora capacity units (ACUs)
      // }
    }); 
    
    this.ssm = new ssm.StringParameter(this, `DBResourceArn-${props.clusterName}`, {
      parameterName: `aurora-serverless-${props.clusterName}-arn`,
      stringValue: this.cluster.clusterArn,
    });
  }
}
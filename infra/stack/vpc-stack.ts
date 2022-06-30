import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcConstruct } from '../../lib/base/vpc-construct';
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { AppContext } from '../../lib/base/app-context';

interface Props extends StackProps {
  vpcName: string,
}

export class VpcStack extends Stack {
  public readonly vpc: ec2.IVpc;
  public readonly backendServerSG: ec2.ISecurityGroup;
  public readonly dbserverSG : ec2.ISecurityGroup;
  
  constructor(appContext: AppContext, id: string, props: Props) {
    super(appContext.cdkApp, id, props);

    const vpcConstruct = new VpcConstruct(this, 'vpc', {
       vpcName: props.vpcName,
    });
    
    this.vpc = vpcConstruct.vpc;
    this.backendServerSG = vpcConstruct.backendServerSG;
    this.dbserverSG = vpcConstruct.dbserverSG;
  }
}
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { InstanceClass, InstanceSize, InstanceType, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2'

export interface VpcInitializerProps {
  vpcName: string
}

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.IVpc
  
  // get availabilityZones(): string[] {
  //   return [ 'ap-northeast-2a', 'ap-northeast-2c'];
  // }
  
  constructor (scope: Construct, id: string, props: VpcInitializerProps) {
    super(scope, id);
    
    this.vpc = new Vpc(this, props.vpcName, {
      // The IP space will be divided over the configured subnets.
      cidr: '10.0.0.0/21',
    
      // 'maxAzs' configures the maximum number of availability zones to use
      // maxAzs: 3,
      
      availabilityZones : ['ap-northeast-2a', 'ap-northeast-2b', 'ap-northeast-2c'],
      
      subnetConfiguration: [{
        cidrMask: 24,
        name: 'ingress',
        subnetType: SubnetType.PUBLIC,
      },{
        cidrMask: 24,
        name: 'compute',
        subnetType: SubnetType.PRIVATE_WITH_NAT,
      },{
        cidrMask: 28,
        name: 'rds',
        subnetType: SubnetType.PRIVATE_ISOLATED,
      }]
    })
  }
}
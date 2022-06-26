import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcConstruct } from './base/vpc-construct';

export class VpcSampleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpcConstruct = new VpcConstruct(this, 'vpcsample', {
       vpcName: 'vpcsample' 
    });
  }
}
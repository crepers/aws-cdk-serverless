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
    
    // Create a SG for a web server
    // const webserverSG = new ec2.SecurityGroup(this, 'web-server-sg', {
    //   vpc: this.vpc,
    //   allowAllOutbound: true,
    //   description: 'security group for a web server',
    // });

    // webserverSG.addIngressRule(
    //   ec2.Peer.anyIpv4(),
    //   ec2.Port.tcp(22),
    //   'allow SSH access from anywhere',
    // );

    // webserverSG.addIngressRule(
    //   ec2.Peer.anyIpv4(),
    //   ec2.Port.tcp(80),
    //   'allow HTTP traffic from anywhere',
    // );

    // webserverSG.addIngressRule(
    //   ec2.Peer.anyIpv4(),
    //   ec2.Port.tcp(443),
    //   'allow HTTPS traffic from anywhere',
    // );

    // webserverSG.addIngressRule(
    //   ec2.Peer.ipv4('123.123.123.123/16'),
    //   ec2.Port.allIcmp(),
    //   'allow ICMP traffic from a specific IP range',
    // );
    
    // // Create a SG for a backend server
    // const backendServerSG = new ec2.SecurityGroup(this, 'backend-server-sg', {
    //   vpc: this.vpc,
    //   allowAllOutbound: true,
    //   description: 'security group for a backend server',
    // });
    // backendServerSG.connections.allowFrom(
    //   new ec2.Connections({
    //     securityGroups: [webserverSG],
    //   }),
    //   ec2.Port.tcp(8000),
    //   'allow traffic on port 8000 from the webserver security group',
    // );

    // // Create a SG for a database server
    // const dbserverSG = new ec2.SecurityGroup(this, 'database-server-sg', {
    //   vpc: this.vpc,
    //   allowAllOutbound: true,
    //   description: 'security group for a database server',
    // });

    // dbserverSG.connections.allowFrom(
    //   new ec2.Connections({
    //     securityGroups: [backendServerSG],
    //   }),
    //   ec2.Port.tcp(3306),
    //   'allow traffic on port 3306 from the backend server security group',
    // );
  }
}
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as cognito from 'aws-cdk-lib/aws-cognito'
import { CognitoUserPool } from './constructs/cognito'

export class AuthStack extends Stack {
  public readonly userPool: cognito.IUserPool
  public readonly userPoolClient: cognito.IUserPoolClient

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const cognitoUserPool = new CognitoUserPool(this, `CognitoUserPool`)
    this.userPool = cognitoUserPool.userPool
    this.userPoolClient = cognitoUserPool.userPoolClient
  }
}
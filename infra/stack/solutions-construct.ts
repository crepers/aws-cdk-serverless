import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class CdkSolutionsConstructsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    
    const generateConstructId = (constructId: string): string => {
      return `${id}-${constructId}`;
    };
    
    const construct = new CognitoToApiGatewayToLambda(this, generateConstructId('api'), {
        lambdaFunctionProps: {
          code: lambda.Code.fromAsset('functions/user-services'),
          runtime: lambda.Runtime.NODEJS_14_X,
          handler: 'hello.handler'
        },
        apiGatewayProps: {
          restApiName: generateConstructId('api'),
          proxy: false,
          deployOptions: { stageName: 'dev' },
          defaultCorsPreflightOptions: {
          allowOrigins: ['*'],
          allowHeaders: ['*'],
          allowMethods: ['*'],
        },
      }
    });
    
    const resource = construct.apiGateway.root.addResource('external');
    resource.addMethod('POST');
    resource.addMethod('GET');
    
    // Mandatory to call this method to Apply the Cognito Authorizers on all API methods
    construct.addAuthorizers();

  }
}

import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha'
import { HttpApi } from './constructs/httpapi'

interface Props extends StackProps {
  userPoolId: string
  userPoolClientId: string
  ns: string
}

export class ApiGatewayStack extends Stack {
  public readonly api: apigwv2.IHttpApi
  public readonly authorizer: apigwv2.IHttpRouteAuthorizer

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props)

    const httpApi = new HttpApi(this, `HttpApi`, {
      userPoolId: props.userPoolId,
      userPoolClientId: props.userPoolClientId,
      ns: props.ns,
    })
    this.api = httpApi.api
    this.authorizer = httpApi.authorizer

    new CfnOutput(this, `HttpApiUrl`, {
      exportName: `${props.ns}HttpApiUrl`,
      value: `${httpApi.api.url}` || 'undefined',
    })
  }

}

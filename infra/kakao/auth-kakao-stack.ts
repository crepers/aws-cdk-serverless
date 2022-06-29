import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha'
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha'

import * as lambda from 'aws-cdk-lib/aws-lambda'
import { KakaoAuth } from './constructs/kakao'

interface Props extends StackProps {
  api: apigwv2.IHttpApi
  authorizer?: apigwv2.IHttpRouteAuthorizer
  userPoolId: string
  userPoolClientId: string,
  ns: string
}

interface RouteProps {
  api: apigwv2.IHttpApi
  authorizer?: apigwv2.IHttpRouteAuthorizer
  routeId: string
  path: string
  method: apigwv2.HttpMethod
  handler: lambda.IFunction
}

export class AuthKakaoStack extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props)

    const kakaoAuth = new KakaoAuth(this, `KakaoAuth`, {
      userPoolId: props.userPoolId,
      userPoolClientId: props.userPoolClientId,
      ns: props.ns,
    })

    this.addRoute({
      api: props.api,
      routeId: 'AuthKakao',
      path: '/auth/kakao',
      method: apigwv2.HttpMethod.POST,
      handler: kakaoAuth.kakaoAuthFunction,
    })
    this.addRoute({
      api: props.api,
      authorizer: props.authorizer,
      routeId: 'Ping',
      path: '/ping',
      method: apigwv2.HttpMethod.GET,
      handler: kakaoAuth.pingFunction,
    })
 
  }
  
  protected addRoute(props: RouteProps) {
    const integration = new HttpLambdaIntegration(`${props.handler}`, props.handler)
    new apigwv2.HttpRoute(this, `${props.routeId}Route`, {
      httpApi: props.api,
      routeKey: apigwv2.HttpRouteKey.with(props.path, props.method),
      authorizer: props.authorizer,
      integration,
    })
  }

}

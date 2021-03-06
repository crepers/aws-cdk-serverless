import { Construct } from 'constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import * as apigwv2 from '@aws-cdk/aws-apigatewayv2-alpha'

interface Props {
  userPoolId: string
  userPoolClientId: string,
  ns: string,
}

export class HttpApi extends Construct {
  public readonly api: apigwv2.HttpApi
  public readonly authorizer: apigwv2.IHttpRouteAuthorizer

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id)

    this.api = this.createHttpApi(props)
    this.authorizer = this.createJWTAuthorizer(this.api, props)
  }

  private createHttpApi(props: Props): apigwv2.HttpApi {
    return new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: `${props.ns}HttpApi`,
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: Duration.days(10),
      },
    })
  }

  private createJWTAuthorizer(httpApi: apigwv2.IHttpApi, props: Props): apigwv2.IHttpRouteAuthorizer {
    const region = Stack.of(this).region

    const authorizer = new apigwv2.HttpAuthorizer(this, `JWTAuthorizer`, {
      authorizerName: `${props.ns}JWTAuthorizer`,
      httpApi,
      type: apigwv2.HttpAuthorizerType.JWT,
      identitySource: ['$request.header.Authorization'],
      jwtAudience: [props.userPoolClientId],
      jwtIssuer: `https://cognito-idp.${region}.amazonaws.com/${props.userPoolId}`,
    })
    return apigwv2.HttpAuthorizer.fromHttpAuthorizerAttributes(this, `JWTRouteAuthorizer`, {
      authorizerId: authorizer.authorizerId,
      authorizerType: apigwv2.HttpAuthorizerType.JWT,
    })
  }

}

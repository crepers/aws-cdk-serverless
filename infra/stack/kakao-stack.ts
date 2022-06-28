import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApiGatewayStack } from '../kakao/apigateway-stack'
import { AuthKakaoStack } from '../kakao/auth-kakao-stack'
import { App, IdentityProvider } from '../../config/config'
// import { CognitoUserPool } from './kakao/cognito';

import * as cognito from 'aws-cdk-lib/aws-cognito';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { AuthStack } from '../kakao/auth-stack';
import { AppContext } from '../../lib/base/app-context';

interface ITriggerFunctions {
  preSignup?: lambda.IFunction
  postConfirmation?: lambda.IFunction
  preAuthentication?: lambda.IFunction
  postAuthentication?: lambda.IFunction
}

export class CognitoKakaoStack extends Stack {
  public readonly userPool: cognito.IUserPool
  public readonly userPoolClient: cognito.IUserPoolClient
  
  constructor(appContext: AppContext, id: string, props?: StackProps) {
    super(appContext.cdkApp, id, props);
    
    const { ns } = App.Context;
    
    // as-is
    // Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './core' is not defined by "exports" in /home/ec2-user/environment/fmk-userservice-backend/node_modules/aws-cdk-lib/package.json
    // const authStack = new AuthStack(this, `${ns}AuthStack`);
    // const apiGatewayStack = new ApiGatewayStack(this, `${ns}ApiGatewayStack`, {
    //   userPoolId: authStack.userPool.userPoolId,
    //   userPoolClientId: authStack.userPoolClient.userPoolClientId,
    // });
    // apiGatewayStack.addDependency(authStack);
    
    // const authKakaoStack = new AuthKakaoStack(this, `${ns}AuthKakaoStack`, {
    //   api: apiGatewayStack.api,
    //   authorizer: apiGatewayStack.authorizer,
    //   userPoolId: authStack.userPool.userPoolId,
    //   userPoolClientId: authStack.userPoolClient.userPoolClientId,
    // });
    // authKakaoStack.addDependency(authStack);
    // authKakaoStack.addDependency(apiGatewayStack);

    // cognito
    const triggerFunctions = this.createTriggerFunctions();
    this.userPool = this.createUserPool(triggerFunctions);
    this.userPoolClient = this.createUserPoolClient(this.userPool);
    

    const apiGatewayStack = new ApiGatewayStack(this, `${ns}ApiGatewayStack`, {
      userPoolId: this.userPool.userPoolId,
      userPoolClientId: this.userPoolClient.userPoolClientId,
    })
    
    const authKakaoStack = new AuthKakaoStack(this, `${ns}AuthKakaoStack`, {
      api: apiGatewayStack.api,
      authorizer: apiGatewayStack.authorizer,
      userPoolId: this.userPool.userPoolId,
      userPoolClientId: this.userPoolClient.userPoolClientId,
    })
    
    authKakaoStack.addDependency(apiGatewayStack);
  }
  
  private createTriggerFunctions(): ITriggerFunctions {
    const preSignup = new NodejsFunction(this, `PreSignupFunction`, {
      functionName: `${App.Context.ns}PreSignupTrigger`,
      entry: path.resolve(__dirname, '..', 'kakao', 'functions', 'pre-signup.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: Duration.seconds(5),
      memorySize: 128,
    })

    const postConfirmation = new NodejsFunction(this, `PostConfirmationFunction`, {
      functionName: `${App.Context.ns}PostConfirmTrigger`,
      entry: path.resolve(__dirname, '..', 'kakao', 'functions', 'post-confirmation.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: Duration.seconds(5),
      memorySize: 128,
    })
    const preAuthentication = new NodejsFunction(this, `PreAuthenticationFunction`, {
      functionName: `${App.Context.ns}PreAuthenticationTrigger`,
      entry: path.resolve(__dirname, '..', 'kakao', 'functions', 'pre-authentication.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: Duration.seconds(5),
      memorySize: 128,
    })

    return {
      preSignup,
      postConfirmation,
      preAuthentication,
    }
  }

  private createUserPool(triggerFunctions: ITriggerFunctions) {
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${App.Context.ns}UserPool`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true },
      },
      customAttributes: {
        provider: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        requireDigits: true,
        requireSymbols: false,
        requireLowercase: true,
        requireUppercase: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      lambdaTriggers: {
        preSignUp: triggerFunctions.preSignup,
        postConfirmation: triggerFunctions.postConfirmation,
        preAuthentication: triggerFunctions.preAuthentication,
        postAuthentication: triggerFunctions.postAuthentication,
      },
    })
    
    new cognito.UserPoolDomain(this, `UserPoolDomain`, {
      userPool,
      cognitoDomain: {
        domainPrefix: `${App.Context.ns.toLowerCase()}${Stack.of(this).account}`,
      },
    })
    return userPool
  }

  private createUserPoolClient(userPool: cognito.IUserPool): cognito.IUserPoolClient {
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPoolClientName: `${App.Context.ns}UserPoolClient`,
      userPool,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        callbackUrls: [IdentityProvider.RedirectUri],
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.OPENID,
        ],
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    })
    return userPoolClient
  }
}

import { Stack, StackProps } from 'aws-cdk-lib';
import { AppContext } from '../../lib/base/app-context';

import * as ssm from "aws-cdk-lib/aws-ssm";
import * as waf from "aws-cdk-lib/aws-wafv2";

interface Props extends StackProps {
    apiGwArn : string
}

export class WafStack extends Stack {

  constructor(appContext: AppContext, id: string, props: Props) {
    super(appContext.cdkApp, id, props);

        const frontendWaf = new waf.CfnWebACL(this, "waf", {
            name: 'APIGWAcl',
            visibilityConfig: {
                cloudWatchMetricsEnabled: true,
                sampledRequestsEnabled: true,
                metricName: "waf-country-block-acl",
            },
            defaultAction: { block: {} },
            scope: "REGIONAL",
            rules: awsManagedRules.map(wafRule => wafRule.rule),
        });

        new waf.CfnWebACLAssociation(this, "webAssociate", {
            webAclArn: frontendWaf.attrArn,
            resourceArn: props.apiGwArn,
        });

        new ssm.StringParameter(this, "WebAclArnParameter", {
            parameterName: 'WebAclCloudFormationName',
            stringValue: frontendWaf.attrArn,
        });
    }
}

interface WafRule {
    name: string;
    rule: waf.CfnWebACL.RuleProperty;
}

const awsManagedRules: WafRule[] = [
    // AWS IP Reputation list includes known malicious actors/bots and is regularly updated
    {
        name: 'AWS-AWSManagedRulesAmazonIpReputationList',
        rule: {
        name: 'AWS-AWSManagedRulesAmazonIpReputationList',
        priority: 10,
        statement: {
            managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesAmazonIpReputationList',
            },
        },
        overrideAction: {
            none: {},
        },
        visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesAmazonIpReputationList',
        },
        },
    },
    // Common Rule Set aligns with major portions of OWASP Core Rule Set
    {
        name: 'AWS-AWSManagedRulesCommonRuleSet',
        rule:
        {
        name: 'AWS-AWSManagedRulesCommonRuleSet',
        priority: 20,
        statement: {
            managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesCommonRuleSet',
            // Excluding generic RFI body rule for sns notifications
            // https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
              excludedRules: [
               { name: 'GenericRFI_BODY' },
               { name: 'SizeRestrictions_BODY' },
            ],
            },
        },
        overrideAction: {
            none: {},
        },
        visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWS-AWSManagedRulesCommonRuleSet',
        },
        },
    },
    // Blocks common SQL Injection
    {
        name: 'AWSManagedRulesSQLiRuleSet',
        rule: {
        name: 'AWSManagedRulesSQLiRuleSet',
        priority: 30,
        visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesSQLiRuleSet',
        },
        overrideAction: {
            none: {},
        },
        statement: {
            managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesSQLiRuleSet',
            excludedRules: [],
            },
        },
        },
    },
    // Blocks common PHP attacks such as using high risk variables and methods in the body or queries
    {
        name: 'AWSManagedRulePHP',
        rule: {
        name: 'AWSManagedRulePHP',
        priority: 40,
        visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulePHP',
        },
        overrideAction: {
            none: {},
        },
        statement: {
            managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesPHPRuleSet',
            excludedRules: [],
            },
        },
        },
    },
    // Blocks attacks targeting LFI(Local File Injection) for linux systems
    {
        name: 'AWSManagedRuleLinux',
        rule: {
        name: 'AWSManagedRuleLinux',
        priority: 50,
        visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRuleLinux',
        },
        overrideAction: {
            none: {},
        },
        statement: {
            managedRuleGroupStatement: {
                vendorName: 'AWS',
                name: 'AWSManagedRulesLinuxRuleSet',
                excludedRules: [],
            },
        },
        },
    },
];
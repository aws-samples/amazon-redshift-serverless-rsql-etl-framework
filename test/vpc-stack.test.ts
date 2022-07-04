import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';

describe('VpcStack', () => {
    test('synthesizes the way we expect', () => {
        const app = new cdk.App();
        const vpcStack = new VpcStack(app, 'VpcStack');
        const vpcTemplate = Template.fromStack(vpcStack);

        vpcTemplate.resourceCountIs('AWS::EC2::Subnet', 2);
        vpcTemplate.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
        vpcTemplate.resourceCountIs('AWS::EC2::InternetGateway', 0);
    });
});

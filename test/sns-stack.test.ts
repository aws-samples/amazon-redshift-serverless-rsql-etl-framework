import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { SnsStack } from '../lib/sns-stack';

describe('SnsStack', () => {
    test('synthesizes the way we expect', () => {
        const app = new cdk.App();
        const snsStack = new SnsStack(app, 'SnsStack');
        const snsTemplate = Template.fromStack(snsStack);

        snsTemplate.resourceCountIs('AWS::SNS::Topic', 1);
        snsTemplate.hasResourceProperties('AWS::SNS::Subscription', {
            Protocol: 'email',
        });
        snsTemplate.hasParameter('EmailAddressSubscription', {
            Type: 'String',
        });
    });
});

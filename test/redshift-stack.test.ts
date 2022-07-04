import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { RedshiftStack } from '../lib/redshift-stack';

describe('RedshiftStack', () => {
    test('synthesizes the way we expect', () => {
        const app = new cdk.App();

        // create dependencies
        const stack = new cdk.Stack(app, 'Stack');
        const loggingBucket = new s3.Bucket(stack, 'LoggingBucket');
        const scriptsBucket = new s3.Bucket(stack, 'ScriptsBucket');
        const dataBucket = new s3.Bucket(stack, 'DataBucket');
        const vpc = new ec2.Vpc(stack, 'vpc');

        const redshiftStack = new RedshiftStack(app, 'RedshiftStack', {
            vpc: vpc,
            loggingBucket: loggingBucket,
            scriptsBucket: scriptsBucket,
            dataBucket: dataBucket,
        });

        const redshiftTemplate = Template.fromStack(redshiftStack);
        redshiftTemplate.hasResourceProperties('AWS::Redshift::Cluster', {
            ClusterIdentifier: 'redshiftblogdemo',
            Encrypted: true,
            PubliclyAccessible: false,
        });
        redshiftTemplate.resourceCountIs('AWS::IAM::Role', 1);
    });

});

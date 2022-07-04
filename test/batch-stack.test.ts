import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as redshift from 'aws-cdk-lib/aws-redshift';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { BatchStack } from '../lib/batch-stack';

describe('BatchStack', () => {
    test('synthesizes the way we expect', () => {
        const app = new cdk.App();

        // create dependencies
        const stack = new cdk.Stack(app, 'Stack');
        const scriptsBucket = new s3.Bucket(stack, 'scriptsBucket');
        const vpc = new ec2.Vpc(stack, 'vpc');
        const repository = new ecr.Repository(stack, 'ecr');
        const redshiftCluster = new redshift.CfnCluster(stack, 'redshift', {
            clusterType: 'single-node',
            dbName: 'test',
            masterUsername: 'test',
            masterUserPassword: 'secret',
            nodeType: 'dc2.large',
        });

        const batchStack = new BatchStack(app, 'BatchStack', {
            redshift: redshiftCluster,
            scriptsBucket: scriptsBucket,
            vpc: vpc,
            ecrRepository: repository,
        });
        const batchTemplate = Template.fromStack(batchStack);
        batchTemplate.hasResourceProperties('AWS::Batch::ComputeEnvironment', {
            Type: 'MANAGED',
            ComputeResources: {
                Type: 'FARGATE',
            },
        });
        batchTemplate.hasResourceProperties('AWS::Batch::JobQueue', {
            Priority: 1,
        });
        batchTemplate.hasResourceProperties('AWS::Batch::JobDefinition', {
            Type: 'container',
            PlatformCapabilities: [
                'FARGATE'
            ],
        });
        batchTemplate.resourceCountIs('AWS::IAM::Role', 2);
    });
});

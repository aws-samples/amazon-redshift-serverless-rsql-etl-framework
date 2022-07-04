import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { S3Stack } from '../lib/s3-stack';

describe('S3Stack', () => {
    test('synthesizes the way we expect', () => {
        const app = new cdk.App();
        const s3Stack = new S3Stack(app, 'S3Stack');
        const s3Template = Template.fromStack(s3Stack);

        s3Template.resourceCountIs('AWS::S3::Bucket', 3);

        s3Template.hasResourceProperties('AWS::S3::Bucket', {
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                    {
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'AES256'
                        }
                    }
                ]
            },
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true
            }
        })
    });
});

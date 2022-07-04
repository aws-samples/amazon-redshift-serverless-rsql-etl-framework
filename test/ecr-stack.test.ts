import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import { EcrRepositoryStack } from '../lib/ecr-stack';

describe('EcrStack', () => {
    test('synthesizes the way we expect', () => {
        const app = new cdk.App();

        const ecrStack = new EcrRepositoryStack(app, 'EcrRepositoryStack');
        const ecrTemplate = Template.fromStack(ecrStack);
        ecrTemplate.hasResourceProperties('AWS::ECR::Repository', {
            EncryptionConfiguration: {
                EncryptionType: 'KMS',
            },
            ImageScanningConfiguration: {
                ScanOnPush: true,
            }
        });
    });
});

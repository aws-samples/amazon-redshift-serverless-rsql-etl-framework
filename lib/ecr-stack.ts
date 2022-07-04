import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class EcrRepositoryStack extends Stack {
    readonly repository: ecr.Repository;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.repository = new ecr.Repository(this, 'amazonlinux-rsql', {
            imageScanOnPush: true,
            encryption: ecr.RepositoryEncryption.KMS,
        });
    }
}

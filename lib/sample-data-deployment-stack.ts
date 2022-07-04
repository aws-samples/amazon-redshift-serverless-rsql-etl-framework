import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

interface SampleDataDeploymentProps extends StackProps {
    scriptsBucket: s3.Bucket;
    dataBucket: s3.Bucket;
}

export class SampleDataDeploymentStack extends Stack {
    constructor(scope: Construct, id: string, props: SampleDataDeploymentProps) {
        super(scope, id, props);

        new s3deploy.BucketDeployment(this, 'S3SampleDataDeploy', {
            sources: [s3deploy.Source.asset(path.join(__dirname, 'sample-data'))],
            destinationBucket: props.dataBucket,
            retainOnDelete: false,
        });

        new s3deploy.BucketDeployment(this, 'S3SampleRSQLScriptsDeploy', {
            sources: [s3deploy.Source.asset(path.join(__dirname, 'etl-rsql'))],
            destinationBucket: props.scriptsBucket,
            retainOnDelete: false,
        });
    }
}
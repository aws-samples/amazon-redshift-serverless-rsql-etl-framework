import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class S3Stack extends Stack {
    readonly scriptsBucket: s3.Bucket;
    readonly dataBucket: s3.Bucket;
    readonly loggingBucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.loggingBucket = new s3.Bucket(this, 'rsql-etl-demo-logging', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });
        this.scriptsBucket = new s3.Bucket(this, 'rsql-etl-demo-scripts', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            serverAccessLogsBucket: this.loggingBucket,
            serverAccessLogsPrefix: 'scripts/'
        });
        this.dataBucket = new s3.Bucket(this, 'rsql-etl-demo-data', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            serverAccessLogsBucket: this.loggingBucket,
            serverAccessLogsPrefix: 'data/'
        });
        this.loggingBucket.addToResourcePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                principals: [new iam.ServicePrincipal('redshift.amazonaws.com')],
                actions: ['s3:GetBucketAcl', 's3:PutObject'],
                resources: [this.loggingBucket.bucketArn, `${this.loggingBucket.bucketArn}/redshift/*`],
            }),
        );
    }
}

import { Stack, StackProps, CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as redshift from 'aws-cdk-lib/aws-redshift';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';

interface RedshiftStackProps extends StackProps {
    vpc: ec2.Vpc;
    loggingBucket: s3.Bucket;
    dataBucket: s3.Bucket;
    scriptsBucket: s3.Bucket;
}

export class RedshiftStack extends Stack {
    readonly redshift: redshift.CfnCluster;
    readonly redshiftRole: iam.Role;

    constructor(scope: Construct, id: string, props: RedshiftStackProps) {
        super(scope, id, props);

        this.redshiftRole = new iam.Role(this, 'DemoRedshift', {
            assumedBy: new iam.ServicePrincipal('redshift.amazonaws.com'),
        });

        // redshift cluster needs read permissions to scripts and data buckets
        props.scriptsBucket.grantRead(this.redshiftRole);
        props.dataBucket.grantRead(this.redshiftRole);

        const parameterGroup = new redshift.CfnClusterParameterGroup(this, 'EnforceSSLParameterGroup', {
            parameters: [{
                parameterName: 'require_ssl',
                parameterValue: 'true',
            }, {
                parameterName: 'enable_user_activity_logging',
                parameterValue: 'true',
            }],
            description: 'Enforcing SSL and Enabling Activity Logging',
            parameterGroupFamily: 'redshift-1.0'
        });

        const clusterSubnetGroup = new redshift.CfnClusterSubnetGroup(this, 'DemoRedshiftClusterSubnetGroup', {
            description: 'DemoRedshiftClusterSubnetGroup',
            subnetIds: props.vpc.isolatedSubnets.map(s => s.subnetId),
        });

        const key = new kms.Key(this, 'RedshiftDemoCredentialsKey', {
            enableKeyRotation: true,
            removalPolicy: RemovalPolicy.DESTROY,
            pendingWindow: Duration.days(7),
        });

        const credentials = new secretsmanager.Secret(this, 'RedshiftDemoCredentials', {
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'etl' }),
                generateStringKey: 'password',
                excludePunctuation: true,
                excludeCharacters: '\'"\\/@',
            },
            encryptionKey: key,
        });

        this.redshift = new redshift.CfnCluster(this, 'RedshiftDemo', {
            clusterIdentifier: 'redshiftblogdemo',
            masterUsername: credentials.secretValueFromJson('username').unsafeUnwrap(),
            masterUserPassword: credentials.secretValueFromJson('password').unsafeUnwrap(),
            dbName: 'demo',
            publiclyAccessible: false,
            enhancedVpcRouting: true,
            clusterSubnetGroupName: clusterSubnetGroup.ref,
            encrypted: true,
            clusterType: 'single-node',
            nodeType: 'dc2.large',
            clusterParameterGroupName: parameterGroup.ref,
            iamRoles: [this.redshiftRole.roleArn],
            loggingProperties: {
                bucketName: props.loggingBucket.bucketName,
                s3KeyPrefix: 'redshift/',
            }
        });
    }
}

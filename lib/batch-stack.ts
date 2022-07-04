import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as batch from 'aws-cdk-lib/aws-batch';
import * as redshift from 'aws-cdk-lib/aws-redshift';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';

interface BatchProps extends StackProps {
    vpc: ec2.Vpc;
    scriptsBucket: s3.Bucket;
    redshift: redshift.CfnCluster;
    ecrRepository: ecr.Repository;
}

export class BatchStack extends Stack {
    readonly computeEnvironment: batch.CfnComputeEnvironment;
    readonly jobQueue: batch.CfnJobQueue;
    readonly jobDefinition: batch.CfnJobDefinition;
    readonly batchExecutionRole: iam.Role;
    readonly batchJobRole: iam.Role;

    constructor(scope: Construct, id: string, props: BatchProps) {
        super(scope, id, props);

        this.batchExecutionRole = new iam.Role(this, 'DemoBatchExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')],
        });

        this.batchJobRole = new iam.Role(this, 'DemoBatchJobRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });

        // batch job role needs:
        // 1. permissions to call GetClusterCredentials for our Redshift cluster
        this.batchJobRole.addToPolicy(new iam.PolicyStatement({
            sid: 'DescribeClusters',
            resources: [
                `arn:aws:redshift:${Stack.of(this).region}:${Stack.of(this).account}:cluster:${props.redshift.clusterIdentifier}`,
            ],
            actions: ['redshift:DescribeClusters'],
        }));
        this.batchJobRole.addToPolicy(new iam.PolicyStatement({
            sid: 'GetRedshiftClusterCredentials',
            resources: [
                `arn:aws:redshift:${Stack.of(this).region}:${Stack.of(this).account}:dbname:${props.redshift.clusterIdentifier}/demo`,
                `arn:aws:redshift:${Stack.of(this).region}:${Stack.of(this).account}:dbuser:${props.redshift.clusterIdentifier}/etl`,
            ],
            actions: ['redshift:GetClusterCredentials'],
        }));
        // 2. permissions to read scripts from S3
        props.scriptsBucket.grantRead(this.batchJobRole);

        this.computeEnvironment = new batch.CfnComputeEnvironment(this, 'DemoComputeEnv', {
            computeEnvironmentName: 'DemoComputeEnv',
            type: 'MANAGED',
            computeResources: {
                subnets: props.vpc.isolatedSubnets.map(s => s.subnetId),
                securityGroupIds: [props.vpc.vpcDefaultSecurityGroup],
                maxvCpus: 256,
                type: 'FARGATE'
            }
        });

        this.jobQueue = new batch.CfnJobQueue(this, 'ETLJobQueue', {
            jobQueueName: 'ETLJobQueue',
            computeEnvironmentOrder: [{
                computeEnvironment: this.computeEnvironment.ref,
                order: 1,
            }],
            priority: 1
        });

        this.jobDefinition = new batch.CfnJobDefinition(this, 'RSQLETLJobDefinition', {
            jobDefinitionName: 'RSQLETLJobDefinition',
            type: 'container',
            containerProperties: {
                image: props.ecrRepository.repositoryUri,
                executionRoleArn: this.batchExecutionRole.roleArn,
                jobRoleArn: this.batchJobRole.roleArn,
                fargatePlatformConfiguration: {
                    platformVersion: 'LATEST',
                },
                resourceRequirements: [{
                    type: 'VCPU',
                    value: '0.25',
                }, {
                    type: 'MEMORY',
                    value: '512',
                }]
            },
            platformCapabilities: ['FARGATE'],
        });
    }
}

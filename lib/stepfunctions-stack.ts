import { Stack, StackProps, Duration, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as batch from 'aws-cdk-lib/aws-batch';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';

interface StepFunctionsProps extends StackProps {
    scriptsBucket: s3.Bucket;
    dataBucket: s3.Bucket;
    jobQueue: batch.CfnJobQueue;
    jobDefinition: batch.CfnJobDefinition;
    snsTopic: sns.Topic;
    snsKey: kms.Key;
    redshiftRole: iam.Role;
}

interface CopyMergeProps {
    stepName: string;
    scriptsBucket: s3.Bucket;
    dataBucket: s3.Bucket;
    redshiftRole: iam.Role;
    jobQueue: batch.CfnJobQueue;
    jobDefinition: batch.CfnJobDefinition;
}

class CopyMerge extends sfn.StateMachineFragment {
    public readonly startState: sfn.State;
    public readonly endStates: sfn.INextable[];

    constructor(parent: Construct, id: string, props: CopyMergeProps) {
        super(parent, id);

        const copy = new tasks.BatchSubmitJob(this, `copy-${props.stepName}`, {
            jobDefinitionArn: props.jobDefinition.ref,
            jobQueueArn: props.jobQueue.ref,
            jobName: `copy-${props.stepName}`,
            containerOverrides: {
                environment: {
                    BATCH_SCRIPT_LOCATION: `s3://${props.scriptsBucket.bucketName}/${props.stepName}/copy.sql`,
                    DATA_BUCKET_NAME: props.dataBucket.bucketName,
                    COPY_IAM_ROLE_ARN: props.redshiftRole.roleArn,
                }
            }
        });

        const merge = new tasks.BatchSubmitJob(this, `merge-${props.stepName}`, {
            jobDefinitionArn: props.jobDefinition.ref,
            jobQueueArn: props.jobQueue.ref,
            jobName: `merge-${props.stepName}`,
            containerOverrides: {
                environment: {
                    BATCH_SCRIPT_LOCATION: `s3://${props.scriptsBucket.bucketName}/${props.stepName}/merge.sql`,
                    DATA_BUCKET_NAME: props.dataBucket.bucketName,
                    COPY_IAM_ROLE_ARN: props.redshiftRole.roleArn,
                }
            }
        });

        const definition = sfn.Chain.start(copy).next(merge);

        this.startState = definition.startState;
        this.endStates = definition.endStates;
    }
}

export class StepFunctionsStack extends Stack {
    readonly stateMachine: sfn.StateMachine;
    readonly stepFunctionsRole: iam.Role;

    constructor(scope: Construct, id: string, props: StepFunctionsProps) {
        super(scope, id, props);

        this.stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
            assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchEventsFullAccess')],
        });

        // StepFunctions needs permissions to the following actions
        // 1. batch:SubmitJob
        this.stepFunctionsRole.addToPolicy(new iam.PolicyStatement({
            sid: 'BatchSubmitJob',
            resources: [
                props.jobDefinition.ref,
            ],
            actions: ['batch:SubmitJob'],
        }));
        // 2. sns:Publish
        this.stepFunctionsRole.addToPolicy(new iam.PolicyStatement({
            sid: 'SNSPublish',
            resources: [
                props.snsTopic.topicArn,
            ],
            actions: ['sns:Publish'],
        }));
        // 3. sns topic is encrypted using KMS key and we need permissions to encrypt/decrypt data
        this.stepFunctionsRole.addToPolicy(new iam.PolicyStatement({
            sid: 'KMS',
            resources: [
                props.snsKey.keyArn
            ],
            actions: [
                'kms:Decrypt',
                'kms:GenerateDataKey'
            ],
        }));

        const succeed = new sfn.Succeed(this, 'success');
        const fail = new sfn.Fail(this, 'error');

        const customerCopyMerge = new CopyMerge(this, 'Customer', {
            stepName: 'customer',
            scriptsBucket: props.scriptsBucket,
            dataBucket: props.dataBucket,
            jobDefinition: props.jobDefinition,
            jobQueue: props.jobQueue,
            redshiftRole: props.redshiftRole,
        });
        const regionCopyMerge = new CopyMerge(this, 'Region', {
            stepName: 'region',
            scriptsBucket: props.scriptsBucket,
            dataBucket: props.dataBucket,
            jobDefinition: props.jobDefinition,
            jobQueue: props.jobQueue,
            redshiftRole: props.redshiftRole,
        });
        const nationCopyMerge = new CopyMerge(this, 'Nation', {
            stepName: 'nation',
            scriptsBucket: props.scriptsBucket,
            dataBucket: props.dataBucket,
            jobDefinition: props.jobDefinition,
            jobQueue: props.jobQueue,
            redshiftRole: props.redshiftRole,
        });

        const shortBranch = sfn.Chain.start(regionCopyMerge).next(nationCopyMerge);

        const errorNotification = new tasks.SnsPublish(this, 'error-notification', {
            topic: props.snsTopic,
            message: sfn.TaskInput.fromJsonPathAt('$'),
        });
        const catchFailed = sfn.Chain.start(errorNotification).next(fail);

        const successNotification = new tasks.SnsPublish(this, 'success-notification', {
            topic: props.snsTopic,
            message: sfn.TaskInput.fromText('Serverless RSQL ETL finished successfully!'),
        });

        const parallel = new sfn.Parallel(this, 'tpc-benchmark-demo-load')
            .branch(customerCopyMerge)
            .branch(shortBranch)
            .addCatch(catchFailed);

        const vacuumAnalyze = new tasks.BatchSubmitJob(this, 'vacuum-analyze', {
            jobDefinitionArn: props.jobDefinition.ref,
            jobQueueArn: props.jobQueue.ref,
            jobName: 'vacuum-analyze',
            containerOverrides: {
                environment: {
                    BATCH_SCRIPT_LOCATION: `s3://${props.scriptsBucket.bucketName}/util/vacuum-analyze.sql`,
                    DATA_BUCKET_NAME: props.dataBucket.bucketName,
                    COPY_IAM_ROLE_ARN: props.redshiftRole.roleArn,
                }
            }
        });

        const definition = sfn.Chain.start(parallel).next(vacuumAnalyze).next(successNotification).next(succeed);

        this.stateMachine = new sfn.StateMachine(this, 'ServerlessRSQLETLFramework', {
            definition,
            timeout: Duration.hours(2),
            role: this.stepFunctionsRole,
        });

        new CfnOutput(this, 'StateMachineArn', { value: this.stateMachine.stateMachineArn });
    }
}

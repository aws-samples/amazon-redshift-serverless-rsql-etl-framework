import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as batch from 'aws-cdk-lib/aws-batch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { StepFunctionsStack } from '../lib/stepfunctions-stack';

describe('StepFunctionsStack', () => {
    test('synthesizes the way we expect', () => {
        const app = new cdk.App();

        // create dependencies
        const stack = new cdk.Stack(app, 'Stack');
        const scriptsBucket = new s3.Bucket(stack, 'ScriptsBucket');
        const dataBucket = new s3.Bucket(stack, 'DataBucket');
        const redshiftRole = new iam.Role(stack, 'RedshiftRole', {
            assumedBy: new iam.ServicePrincipal('redshift.amazonaws.com'),
        });
        const snsTopic = new sns.Topic(stack, 'SnsNotificationTopic');
        const snsKey = new kms.Key(stack, 'SnsTopicKey');

        const jobDefinition = new batch.CfnJobDefinition(stack, 'BatchJobDefinition', {
            type: 'container',
        });
        const jobQueue = new batch.CfnJobQueue(stack, 'BatchJobQueue', {
            priority: 1,
            computeEnvironmentOrder: [{
                computeEnvironment: 'arn:test:only',
                order: 1,
            }],
        });

        const stepFunctionsStack = new StepFunctionsStack(app, 'StepFunctionsStack', {
            scriptsBucket: scriptsBucket,
            dataBucket: dataBucket,
            jobDefinition: jobDefinition,
            jobQueue: jobQueue,
            redshiftRole: redshiftRole,
            snsTopic: snsTopic,
            snsKey: snsKey,
        });
        const stepFunctionsTemplate = Template.fromStack(stepFunctionsStack);
        stepFunctionsTemplate.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
        stepFunctionsTemplate.resourceCountIs('AWS::IAM::Role', 1);
    });
});

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcrRepositoryStack } from '../lib/ecr-stack';
import { RsqlDockerImageStack } from '../lib/rsql-docker-image-stack';
import { S3Stack } from '../lib/s3-stack';
import { VpcStack } from '../lib/vpc-stack';
import { RedshiftStack } from '../lib/redshift-stack';
import { BatchStack } from '../lib/batch-stack';
import { StepFunctionsStack } from '../lib/stepfunctions-stack';
import { SnsStack } from '../lib/sns-stack';
import { SampleDataDeploymentStack } from '../lib/sample-data-deployment-stack';
import { Tags } from 'aws-cdk-lib';

const env = {
  account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION
};

const app = new cdk.App();

Tags.of(app).add('purpose', 'aws-blog-demo-serverless-rsql-etl-framework');

const vpcStack = new VpcStack(app, 'VpcStack', {
  env: env,
});
const s3Stack = new S3Stack(app, 'S3Stack', {
  env: env,
});
const redshiftStack = new RedshiftStack(app, 'RedshiftStack', {
  env: env,
  vpc: vpcStack.vpc,
  loggingBucket: s3Stack.loggingBucket,
  scriptsBucket: s3Stack.scriptsBucket,
  dataBucket: s3Stack.dataBucket,
});
const ecrRepositoryStack = new EcrRepositoryStack(app, 'EcrRepositoryStack', {
  env: env,
});
const rsqlDockerImageStack = new RsqlDockerImageStack(app, 'RsqlDockerImageStack', {
  env: env,
  repository: ecrRepositoryStack.repository,
  redshift: redshiftStack.redshift,
});
const batchStack = new BatchStack(app, 'BatchStack', {
  env: env,
  redshift: redshiftStack.redshift,
  ecrRepository: ecrRepositoryStack.repository,
  vpc: vpcStack.vpc,
  scriptsBucket: s3Stack.scriptsBucket,
});
const snsStack = new SnsStack(app, 'SnsStack', {
  env: env,
});
const stepFunctionsStack = new StepFunctionsStack(app, 'StepFunctionsStack', {
  env: env,
  jobDefinition: batchStack.jobDefinition,
  jobQueue: batchStack.jobQueue,
  scriptsBucket: s3Stack.scriptsBucket,
  dataBucket: s3Stack.dataBucket,
  redshiftRole: redshiftStack.redshiftRole,
  snsTopic: snsStack.topic,
  snsKey: snsStack.key,
});
const sampleDataDeploymentStack = new SampleDataDeploymentStack(app, 'SampleDataDeploymentStack', {
  env: env,
  scriptsBucket: s3Stack.scriptsBucket,
  dataBucket: s3Stack.dataBucket,
});

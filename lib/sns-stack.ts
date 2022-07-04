import { Stack, StackProps, CfnParameter, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export class SnsStack extends Stack {
    readonly topic: sns.Topic;
    readonly key: kms.Key;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.key = new kms.Key(this, 'RSQLSNSNotificationKey', {
            enableKeyRotation: true,
            removalPolicy: RemovalPolicy.DESTROY,
            pendingWindow: Duration.days(7),
        });

        this.topic = new sns.Topic(this, 'RSQLNotificationTopic', {
            displayName: 'Serverless RSQL ETL framework topic',
            masterKey: this.key,
        });

        const emailAddressSubscription = new CfnParameter(this, 'EmailAddressSubscription');
        this.topic.addSubscription(new subscriptions.EmailSubscription(emailAddressSubscription.valueAsString));
    }
}

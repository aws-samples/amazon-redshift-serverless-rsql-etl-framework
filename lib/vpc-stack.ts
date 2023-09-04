import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VpcStack extends Stack {
    readonly vpc: ec2.Vpc;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.vpc = new ec2.Vpc(this, 'RedshiftVPC', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: 3,
            subnetConfiguration: [
                {
                    name: 'isolated-subnet',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 26,
                },
            ]
        });
        this.vpc.addGatewayEndpoint('S3Gateway', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [{
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED
            }]
        });
        this.vpc.addInterfaceEndpoint('ECR-API', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
        });
        this.vpc.addInterfaceEndpoint('ECR-DKR', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        });
        this.vpc.addInterfaceEndpoint('CloudWatchLogs', {
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        });
        this.vpc.addInterfaceEndpoint('Redshift', {
            service: {
                name: `com.amazonaws.${Stack.of(this).region}.redshift`,
                port: 443,
            }
        });
    }
}

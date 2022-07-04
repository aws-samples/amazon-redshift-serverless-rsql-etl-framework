import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as redshift from 'aws-cdk-lib/aws-redshift';
import * as path from 'path';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecrdeploy from 'cdk-ecr-deployment';

interface RsqlDockerImageProps extends StackProps {
    repository: ecr.Repository;
    redshift: redshift.CfnCluster;
}

export class RsqlDockerImageStack extends Stack {
    readonly image: DockerImageAsset;

    constructor(scope: Construct, id: string, props: RsqlDockerImageProps) {
        super(scope, id, props);

        // before building docker image update region in .odbc.ini file
        const region = Stack.of(this).region;
        const fs = require('fs');
        const odbcIni = path.join(__dirname, 'amazonlinux-rsql', '.odbc.ini');
        fs.readFile(odbcIni, 'utf8', function (err: any, data: string) {
            if (err) {
                return console.log(err);
            }
            var result = data.replace(/Region=.*/g, `Region=${region}`);

            fs.writeFile(odbcIni, result, 'utf8', function (err: any) {
                if (err) return console.log(err);
            });
        });

        this.image = new DockerImageAsset(this, 'amazonlinux-rsql-image', {
            directory: path.join(__dirname, 'amazonlinux-rsql'),
        });

        const deployment = new ecrdeploy.ECRDeployment(this, 'DeployDockerImage', {
            src: new ecrdeploy.DockerImageName(this.image.imageUri),
            dest: new ecrdeploy.DockerImageName(props.repository.repositoryUri),
        });
    }
}

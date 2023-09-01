#!/bin/bash

# This scripts expects the following env variables to be set:
# BATCH_SCRIPT_LOCATION - full S3 path to RSQL script to run
# DATA_BUCKET_NAME - S3 bucket name with the data
# COPY_IAM_ROLE_ARN - IAM role ARN that will be used to copy the data from S3 to Redshift

PATH="/bin:/usr/bin:/sbin:/usr/sbin:/usr/local/bin:/usr/local/sbin"

if [ -z "${BATCH_SCRIPT_LOCATION}" ] || [ -z "${DATA_BUCKET_NAME}" ] || [ -z "${COPY_IAM_ROLE_ARN}" ]; then
    echo "BATCH_SCRIPT_LOCATION/DATA_BUCKET_NAME/COPY_IAM_ROLE_ARN not set. No script to run."
    exit 1
fi

# download script to a temp file
TEMP_SCRIPT_FILE=$(mktemp)
aws s3 cp ${BATCH_SCRIPT_LOCATION} ${TEMP_SCRIPT_FILE}

rsql --version

# execute script
# envsubst will replace ${COPY_IAM_ROLE_ARN} and ${COPY_IAM_ROLE_ARN} placeholders with actual values
envsubst < ${TEMP_SCRIPT_FILE} | rsql -D etl

exit $?

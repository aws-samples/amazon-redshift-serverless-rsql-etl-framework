create table if not exists customer (
  C_CUSTKEY bigint NOT NULL,
  C_NAME varchar(25),
  C_ADDRESS varchar(40),
  C_NATIONKEY bigint,
  C_PHONE varchar(15),
  C_ACCTBAL decimal(18,4),
  C_MKTSEGMENT varchar(10),
  C_COMMENT varchar(117));

create table if not exists customer_stage (like customer);

truncate customer_stage;

copy customer_stage from 's3://${DATA_BUCKET_NAME}/customer.tbl.lzo'
iam_role '${COPY_IAM_ROLE_ARN}'
lzop delimiter '|' COMPUPDATE PRESET;

\if :ERROR <> 0
  \remark 'Customer staging finished with error:' :ERRORCODE
  \remark :LAST_ERROR_MESSAGE
  \exit 1
\endif

\remark 'Customer staging finished OK'
\exit 0

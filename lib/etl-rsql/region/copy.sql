CREATE TABLE if not exists region (
  R_REGIONKEY bigint NOT NULL,
  R_NAME varchar(25),
  R_COMMENT varchar(152));

create table if not exists region_stage (like region);

truncate region_stage;

COPY region_stage FROM 's3://${DATA_BUCKET_NAME}/region.tbl.lzo'
iam_role '${COPY_IAM_ROLE_ARN}'
lzop delimiter '|' COMPUPDATE PRESET;

\if :ERROR <> 0
  \remark 'Region staging finished with error:' :ERRORCODE
  \remark :LAST_ERROR_MESSAGE
  \exit 1
\endif

\remark 'Region staging finished OK'
\exit 0

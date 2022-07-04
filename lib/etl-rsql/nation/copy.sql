create table if not exists nation (
  N_NATIONKEY bigint NOT NULL,
  N_NAME varchar(25),
  N_REGIONKEY bigint,
  N_COMMENT varchar(152));

create table if not exists nation_stage (like nation);

truncate nation_stage;

COPY nation_stage FROM 's3://${DATA_BUCKET_NAME}/nation.tbl.lzo'
iam_role '${COPY_IAM_ROLE_ARN}'
lzop delimiter '|' COMPUPDATE PRESET;

\if :ERROR <> 0
  \remark 'Nation staging finished with error:' :ERRORCODE
  \remark :LAST_ERROR_MESSAGE
  \exit 1
\endif

\remark 'Nation staging finished OK'
\exit 0

FROM amazonlinux:2

ENV AMAZON_REDSHIFT_ODBC_VERSION=1.4.52.1000
ENV AMAZON_REDSHIFT_RSQL_VERSION=1.0.4

RUN yum install -y openssl unixODBC gettext awscli && \
    yum clean all

RUN rpm -i \
    https://s3.amazonaws.com/redshift-downloads/drivers/odbc/${AMAZON_REDSHIFT_ODBC_VERSION}/AmazonRedshiftODBC-64-bit-${AMAZON_REDSHIFT_ODBC_VERSION}-1.x86_64.rpm \
    https://s3.amazonaws.com/redshift-downloads/amazon-redshift-rsql/${AMAZON_REDSHIFT_RSQL_VERSION}/AmazonRedshiftRsql-${AMAZON_REDSHIFT_RSQL_VERSION}-1.x86_64.rpm

COPY .odbc.ini .odbc.ini
COPY fetch_and_run.sh /usr/local/bin/fetch_and_run.sh

ENV ODBCINI=.odbc.ini
ENV ODBCSYSINI=/opt/amazon/redshiftodbc/Setup
ENV AMAZONREDSHIFTODBCINI=/opt/amazon/redshiftodbc/lib/64/amazon.redshiftodbc.ini

ENTRYPOINT ["/usr/local/bin/fetch_and_run.sh"]

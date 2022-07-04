begin;

\remark 'Number of customers before the load'

select count(*) from customer;

-- Step 3a: delete customer which no longer exist in customer_stage
delete from customer where C_CUSTKEY not in (select C_CUSTKEY from customer_stage);

-- Step 3b: delete all existing records and replace them with new records
delete from customer using customer_stage
where customer_stage.C_CUSTKEY = customer.C_CUSTKEY;

-- Step 3c: insert delta (new & updated customer) from stage to target table
insert into customer
select * from customer_stage;

\remark 'Number of customers after the load'

select count(*) from customer;

commit;

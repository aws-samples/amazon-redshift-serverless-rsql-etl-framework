begin;

\remark 'Number of nations before the load'

select count(*) from nation;

-- Step 3a: delete nation which no longer exist in nation_stage
delete from nation where N_NATIONKEY not in (select N_NATIONKEY from nation_stage);

-- Step 3b: delete all existing records and replace them with new records
delete from nation using nation_stage
where nation_stage.N_NATIONKEY = nation.N_NATIONKEY;

-- Step 3c: insert delta (new & updated nation) from stage to target table
insert into nation
select * from nation_stage;

\remark 'Number of nations after the load'

select count(*) from nation;

commit;

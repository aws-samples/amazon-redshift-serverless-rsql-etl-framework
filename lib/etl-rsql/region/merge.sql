begin;

\remark 'Number of regions before the load'

select count(*) from region;

-- Step 3a: delete region which no longer exist in region_stage
delete from region where R_REGIONKEY not in (select R_REGIONKEY from region_stage);

-- Step 3b: delete all existing records and replace them with new records
delete from region using region_stage
where region_stage.R_REGIONKEY = region.R_REGIONKEY;

-- Step 3c: insert delta (new & updated region) from stage to target table
insert into region
select * from region_stage;

\remark 'Number of regions after the load'

select count(*) from region;

commit;

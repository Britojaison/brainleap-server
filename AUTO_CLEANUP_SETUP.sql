-- Enable the pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Schedule a job to run every 10 minutes
-- This will delete any rows in 'verification_codes' where 'expires_at' is in the past
select cron.schedule(
  'delete-expired-otps', -- unique name for the job
  '*/10 * * * *',        -- cron syntax: every 10 minutes
  $$ delete from public.verification_codes where expires_at < now(); $$
);

-- To verify it's running, you can check:
-- select * from cron.job_run_details order by start_time desc;

-- To unschedule/stop it later if needed:
-- select cron.unschedule('delete-expired-otps');

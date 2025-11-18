-- Enable Realtime for tables used in real-time subscriptions

-- Set REPLICA IDENTITY to FULL for tables we want to track changes on
-- FULL means we get the full row data for UPDATE and DELETE events
ALTER TABLE generated_variations REPLICA IDENTITY FULL;
ALTER TABLE mutated_variations REPLICA IDENTITY FULL;
ALTER TABLE generation_jobs REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
-- This enables real-time broadcasting of changes to subscribed clients
ALTER PUBLICATION supabase_realtime ADD TABLE generated_variations;
ALTER PUBLICATION supabase_realtime ADD TABLE mutated_variations;
ALTER PUBLICATION supabase_realtime ADD TABLE generation_jobs;

-- MiniCAD complete Supabase schema
--
-- Purpose
-- -------
-- This is the single entry point for all SQL used by MiniCAD. The executable
-- definitions remain in ordered migration files so the schema and deployment
-- history cannot drift apart.
--
-- Run with psql from the repository root:
--   psql "$DATABASE_URL" -f supabase/schema.sql
--
-- Supabase Dashboard SQL Editor does not support psql's \ir command. When
-- using the Dashboard, open and run each file below in the same order.

\set ON_ERROR_STOP on

-- 1. Incident foundation
-- Creates incidents, validation constraints, queue indexes, dispatcher/officer
-- RLS policies, timestamps, and the Realtime publication entry.
\ir migrations/202609030001_create_incidents.sql

-- 2. Officer identity and availability
-- Creates safe public profiles, officer duty state, the Auth synchronization
-- trigger, role-aware RLS policies, and the set_officer_duty RPC.
\ir migrations/202609030002_create_officer_duty.sql

-- 3. Officer incident visibility
-- Extends incident access so authenticated officers can receive dispatched work
-- while still protecting caller information through RLS.
\ir migrations/202609030002_officer_sees_new_incidents.sql

-- 4. Reliable live officer roster
-- Adds the private officer-duty Realtime topic, authorization policy, broadcast
-- trigger, and compact availability invalidation payload.
\ir migrations/202609030003_fix_officer_duty_realtime.sql

-- 5. Dispatch and first-wins claiming
-- Adds transactional dispatch/claim RPCs and the private incident-change topic.
-- The conditional claim update makes simultaneous claims deterministic.
\ir migrations/202609030004_add_incident_dispatch_and_claim.sql

-- 6. Response pipeline, reports, and notifications
-- Adds response status transitions, final reports, availability locking,
-- push-token registration, one-active-assignment enforcement, report RLS, and
-- the private report notification topic.
\ir migrations/202609030005_add_response_reports_and_push_tokens.sql

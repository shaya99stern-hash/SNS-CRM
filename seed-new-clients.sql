-- Add these new SNS Leads clients into Supabase.
-- Paste into Supabase SQL Editor and run once.
-- Safe to rerun: it updates the same client records instead of duplicating them.

insert into public.clients (
  id,
  company,
  contact,
  phone,
  email,
  status,
  meeting_date,
  meeting_owner,
  next_step,
  follow_up,
  close_status,
  notes,
  updated_at
)
values
  (
    'client-upstate-servicing-group-issac-malik',
    'Upstate servicing group',
    'Issac Malik',
    '(845) 422-2107',
    'imalik@usgny.com',
    'Prospective',
    null,
    '',
    '',
    '',
    '',
    'Imported from screenshot. Screenshot shows 8 buildings.',
    now()
  ),
  (
    'client-garden-springs-mark-friedman',
    'Garden Springs',
    'Mark Friedman',
    '+1 (917) 974-6115',
    'mark@eastbrookhealth.com',
    'Prospective',
    null,
    'Jack',
    '',
    '',
    '',
    'Added from user-provided client details.',
    now()
  )
on conflict (id) do update set
  company = excluded.company,
  contact = excluded.contact,
  phone = excluded.phone,
  email = excluded.email,
  status = excluded.status,
  meeting_date = excluded.meeting_date,
  meeting_owner = excluded.meeting_owner,
  next_step = excluded.next_step,
  follow_up = excluded.follow_up,
  close_status = excluded.close_status,
  notes = excluded.notes,
  updated_at = now();

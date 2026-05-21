alter table public.sections
add column if not exists section_details jsonb not null default '{}';

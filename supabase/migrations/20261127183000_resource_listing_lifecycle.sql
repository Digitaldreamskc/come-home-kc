alter table public.resources add column if not exists deadline_at timestamptz, add column if not exists listing_type text not null default 'ongoing', add column if not exists organizer text, add column if not exists cost_label text;
alter table public.events add column if not exists source_url text, add column if not exists organizer text, add column if not exists cost_label text;

create type public.app_role as enum (
  'MASTER_ADMIN',
  'CARETAKER',
  'CLEANER',
  'RESIDENT'
);

create type public.task_status as enum (
  'NEW',
  'DOING',
  'DONE'
);

create type public.task_priority as enum (
  'P1',
  'P2',
  'P3'
);

create type public.problem_category as enum (
  'Plumbing',
  'Electrical',
  'HVAC',
  'Structural',
  'Appliance',
  'Lighting',
  'Other'
);

create type public.complaint_category as enum (
  'Cleaning',
  'Noise',
  'Waste',
  'Pest',
  'Common Area',
  'Safety',
  'Other'
);

create type public.reporter_type as enum (
  'USER',
  'RESIDENT'
);

create type public.task_activity_type as enum (
  'created',
  'status_changed',
  'priority_set',
  'assigned',
  'reassigned',
  'comment',
  'photo_added',
  'reopened',
  'accepted',
  'synced'
);

create type public.task_attachment_kind as enum (
  'PRIMARY',
  'EXTRA'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.users (
  id text primary key,
  name text not null,
  role public.app_role not null,
  initials text not null,
  hue integer not null check (hue >= 0 and hue <= 360),
  hidden boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.blocks (
  id text primary key,
  name text not null unique,
  description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.flats (
  id text primary key,
  block_id text not null references public.blocks(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (block_id, label)
);

create table public.tasks (
  id text primary key,
  title text not null check (char_length(trim(title)) > 0),
  description text not null check (char_length(trim(description)) > 0),
  photo_path text,
  block_id text not null references public.blocks(id) on delete restrict,
  flat_id text not null references public.flats(id) on delete restrict,
  problem_category public.problem_category,
  complaint_category public.complaint_category,
  status public.task_status not null default 'NEW',
  priority public.task_priority,
  created_by_id text not null references public.users(id) on delete restrict,
  reporter_type public.reporter_type,
  reporter_name text,
  assignee_id text references public.users(id) on delete set null,
  client_created_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tasks_reporter_name_check check (
    reporter_type is distinct from 'RESIDENT'::public.reporter_type
    or reporter_name is not null
  )
);

create table public.task_comments (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  author_id text not null references public.users(id) on delete restrict,
  text text not null check (char_length(trim(text)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.task_activity (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  actor_id text not null references public.users(id) on delete restrict,
  type public.task_activity_type not null,
  message text not null,
  meta jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.task_attachments (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  uploaded_by_id text not null references public.users(id) on delete restrict,
  storage_path text not null unique,
  file_name text,
  mime_type text,
  kind public.task_attachment_kind not null default 'EXTRA',
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_flats_block_id on public.flats(block_id);
create index idx_tasks_block_id on public.tasks(block_id);
create index idx_tasks_flat_id on public.tasks(flat_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_priority on public.tasks(priority);
create index idx_tasks_assignee_id on public.tasks(assignee_id);
create index idx_tasks_created_by_id on public.tasks(created_by_id);
create index idx_tasks_created_at_desc on public.tasks(created_at desc);
create index idx_tasks_updated_at_desc on public.tasks(updated_at desc);
create index idx_task_comments_task_created_at_desc on public.task_comments(task_id, created_at desc);
create index idx_task_activity_task_created_at_desc on public.task_activity(task_id, created_at desc);
create index idx_task_attachments_task_kind on public.task_attachments(task_id, kind);

create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create trigger set_blocks_updated_at
before update on public.blocks
for each row
execute function public.set_updated_at();

create trigger set_flats_updated_at
before update on public.flats
for each row
execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

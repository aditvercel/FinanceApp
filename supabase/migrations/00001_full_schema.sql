-- ============================================================
-- FinanceApp — Complete Supabase Schema
-- Run this in Supabase SQL Editor (or via migration)
-- ============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- Nanoid function (short unique ID generator)
-- Uses gen_random_bytes from pgcrypto
create or replace function nanoid(size int default 21)
returns text language plpgsql stable strict as $$
declare
  id text := '';
  i int := 0;
  url_alphabet text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  bytes bytea;
  byte int;
  pos int;
begin
  bytes := gen_random_bytes(size);
  for i in 1..size loop
    byte := get_byte(bytes, i - 1);
    pos := (byte & 63) + 1;
    id := id || substr(url_alphabet, pos, 1);
  end loop;
  return id;
end;
$$;

-- 1. Custom Types
create type member_role as enum ('owner', 'editor', 'viewer');
create type entry_type as enum ('income', 'expense');
create type recurrence_interval as enum ('weekly', 'monthly', 'yearly');

-- ============================================================
-- 2. Core Tables
-- ============================================================

-- 2a. User Preferences (onboarding, settings)
create table user_preferences (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid unique not null references auth.users(id) on delete cascade,
  onboarding_completed boolean not null default false,
  default_currency    text not null default 'IDR',
  display_name        text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table user_preferences enable row level security;

create policy "users manage own preferences" on user_preferences for all
  using (auth.uid() = user_id);

-- 2b. Reports
create table reports (
  id           uuid primary key default gen_random_uuid(),
  report_id    text unique not null default nanoid(10),
  name         text not null,
  owner_id     uuid not null references auth.users(id),
  currency     text not null default 'IDR',
  store_receipts boolean not null default false,
  deleted_at   timestamptz,
  delete_confirmed_name text,
  created_at   timestamptz default now()
);

alter table reports enable row level security;

-- 2b. Report Members (must exist before policies that reference it)
create table report_members (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid not null references reports(id) on delete cascade,
  user_id    uuid not null references auth.users(id),
  role       member_role not null default 'viewer',
  granted_by uuid references auth.users(id),
  granted_at timestamptz default now(),
  unique (report_id, user_id)
);

alter table report_members enable row level security;

-- Reports policies (after report_members exists)
create policy "owner full access" on reports for all
  using (auth.uid() = owner_id);

create policy "members read access" on reports for select
  using (
    exists (
      select 1 from report_members
      where report_members.report_id = reports.id
      and report_members.user_id = auth.uid()
    )
  );

-- Report members policies
create policy "owner manages members" on report_members for all
  using (
    exists (
      select 1 from reports
      where reports.id = report_members.report_id
      and reports.owner_id = auth.uid()
    )
  );

create policy "members view own membership" on report_members for select
  using (auth.uid() = user_id);

-- 2c. Entries (immutable — never updated, only appended to)
create table entries (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  created_by  uuid not null references auth.users(id),
  draft_id    uuid unique,
  created_at  timestamptz default now()
);

alter table entries enable row level security;

create policy "report members read entries" on entries for select
  using (
    exists (
      select 1 from report_members rm
      join reports r on r.id = rm.report_id
      where r.id = entries.report_id
      and (rm.user_id = auth.uid() or r.owner_id = auth.uid())
    )
  );

create policy "editors and owner insert entries" on entries for insert
  with check (
    exists (
      select 1 from report_members rm
      join reports r on r.id = rm.report_id
      where r.id = entries.report_id
      and rm.user_id = auth.uid()
      and rm.role in ('editor', 'owner')
    )
    or exists (
      select 1 from reports r
      where r.id = entries.report_id
      and r.owner_id = auth.uid()
    )
  );

-- 2d. Entry Snapshots (audit trail — every change writes a new row)
create table entry_snapshots (
  id             uuid primary key default gen_random_uuid(),
  entry_id       uuid not null references entries(id) on delete cascade,
  version        int not null,
  changed_by     uuid not null references auth.users(id),
  action         text not null,
  reverted_from  int,
  type           entry_type not null,
  amount         numeric(15, 2) not null,
  amount_original       numeric(15, 2),
  currency_original     text,
  exchange_rate         numeric(20, 6),
  exchange_rate_source  text,
  exchanged_at          timestamptz,
  category       text not null,
  note           text,
  merchant       text,
  entry_date     date not null,
  is_current     boolean not null default true,
  receipt_image_path text,
  changed_at     timestamptz default now(),
  unique (entry_id, version)
);

create index on entry_snapshots(entry_id, is_current);
create index on entry_snapshots(entry_id, version);

alter table entry_snapshots enable row level security;

create policy "report members read snapshots" on entry_snapshots for select
  using (
    exists (
      select 1 from entries e
      join report_members rm on rm.report_id = e.report_id
      where e.id = entry_snapshots.entry_id
      and (rm.user_id = auth.uid())
    )
    or exists (
      select 1 from entries e
      join reports r on r.id = e.report_id
      where e.id = entry_snapshots.entry_id
      and r.owner_id = auth.uid()
    )
  );

create policy "service role insert only" on entry_snapshots for insert
  with check (false);

-- 2e. Entry Line Items (receipt scan detail)
create table entry_line_items (
  id                uuid primary key default gen_random_uuid(),
  entry_id          uuid not null references entries(id) on delete cascade,
  snapshot_version  int not null,
  name              text not null,
  price             numeric(15, 2) not null,
  confidence        text not null,
  created_at        timestamptz default now()
);

alter table entry_line_items enable row level security;

create policy "report members read line items" on entry_line_items for select
  using (
    exists (
      select 1 from entries e
      join report_members rm on rm.report_id = e.report_id
      where e.id = entry_line_items.entry_id
      and rm.user_id = auth.uid()
    )
    or exists (
      select 1 from entries e
      join reports r on r.id = e.report_id
      where e.id = entry_line_items.entry_id
      and r.owner_id = auth.uid()
    )
  );

create policy "service role insert only" on entry_line_items for insert
  with check (false);

-- ============================================================
-- 3. Finance Features
-- ============================================================

-- 3a. Budgets
create table budgets (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  category    text not null,
  amount      numeric(15, 2) not null,
  period      text not null default 'monthly',
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz default now(),
  unique (report_id, category)
);

alter table budgets enable row level security;

create policy "owner and editors manage budgets" on budgets for all
  using (
    exists (
      select 1 from report_members rm
      where rm.report_id = budgets.report_id
      and rm.user_id = auth.uid()
      and rm.role in ('owner', 'editor')
    )
    or exists (
      select 1 from reports r
      where r.id = budgets.report_id
      and r.owner_id = auth.uid()
    )
  );

create policy "members read budgets" on budgets for select
  using (
    exists (
      select 1 from report_members rm
      where rm.report_id = budgets.report_id
      and rm.user_id = auth.uid()
    )
  );

-- 3b. Budget Alert State (deduplication latch)
create table budget_alert_state (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references reports(id) on delete cascade,
  category        text not null,
  threshold       text not null,
  alerted_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  unique (report_id, category, threshold)
);

alter table budget_alert_state enable row level security;
-- Accessed only via service role; no RLS policies needed.

-- 3c. Recurring Templates
create table recurring_templates (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references reports(id) on delete cascade,
  created_by    uuid not null references auth.users(id),
  type          entry_type not null,
  amount        numeric(15, 2) not null,
  category      text not null,
  note          text,
  interval      recurrence_interval not null,
  day_of_month  int check (day_of_month between 1 and 28),
  day_of_week   int check (day_of_week between 0 and 6),
  month_of_year int check (month_of_year between 1 and 12),
  next_run_date date not null,
  is_active     boolean not null default true,
  created_at    timestamptz default now()
);

alter table recurring_templates enable row level security;

create policy "owner and editors manage recurring" on recurring_templates for all
  using (
    exists (
      select 1 from report_members rm
      where rm.report_id = recurring_templates.report_id
      and rm.user_id = auth.uid()
      and rm.role in ('owner', 'editor')
    )
    or exists (
      select 1 from reports r
      where r.id = recurring_templates.report_id
      and r.owner_id = auth.uid()
    )
  );

create policy "members read recurring" on recurring_templates for select
  using (
    exists (
      select 1 from report_members rm
      where rm.report_id = recurring_templates.report_id
      and rm.user_id = auth.uid()
    )
  );

-- 3d. Recurring Runs (cron audit)
create table recurring_runs (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references recurring_templates(id),
  entry_id        uuid references entries(id),
  run_date        date not null,
  status          text not null,
  error           text,
  created_at      timestamptz default now()
);

alter table recurring_runs enable row level security;
-- Accessed only via service role (cron); no RLS policies needed.

-- 3e. Custom Categories
create table report_categories (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  name        text not null,
  emoji       text not null default '📦',
  is_default  boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  unique (report_id, name)
);

alter table report_categories enable row level security;

create policy "members read categories" on report_categories for select
  using (
    exists (
      select 1 from report_members rm
      where rm.report_id = report_categories.report_id
      and rm.user_id = auth.uid()
    )
    or exists (
      select 1 from reports r
      where r.id = report_categories.report_id
      and r.owner_id = auth.uid()
    )
  );

create policy "owner and editors manage categories" on report_categories for all
  using (
    exists (
      select 1 from report_members rm
      where rm.report_id = report_categories.report_id
      and rm.user_id = auth.uid()
      and rm.role in ('owner', 'editor')
    )
    or exists (
      select 1 from reports r
      where r.id = report_categories.report_id
      and r.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 4. AI & Observability
-- ============================================================

-- 4a. AI Usage Logs
create table ai_usage_logs (
  id            uuid primary key default gen_random_uuid(),
  request_id    text not null,
  user_id       uuid not null references auth.users(id),
  model         text not null,
  input_tokens  int not null,
  output_tokens int not null,
  latency_ms    int not null,
  error         text,
  route         text,
  created_at    timestamptz default now()
);

alter table ai_usage_logs enable row level security;

create policy "select own usage" on ai_usage_logs for select
  using (auth.uid() = user_id);

create policy "service insert" on ai_usage_logs for insert
  with check (false);

-- 4b. AI Rate Counters
create table ai_rate_counters (
  user_id      uuid primary key references auth.users(id),
  count        int not null default 0,
  window_start timestamptz not null default now()
);

alter table ai_rate_counters enable row level security;
-- No policies — accessed only via service role

-- 4c. Offline Drafts
create table offline_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id),
  report_id   uuid not null references reports(id),
  payload     jsonb not null,
  source      text not null default 'client',
  created_at  timestamptz default now(),
  flushed_at  timestamptz
);

alter table offline_drafts enable row level security;

create policy "users manage own drafts" on offline_drafts for all
  using (auth.uid() = user_id);

-- ============================================================
-- 5. Activity & Notifications
-- ============================================================

-- 5a. Activity Events (feed)
create table activity_events (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  actor_id    uuid not null references auth.users(id),
  event_type  text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz default now()
);

create index on activity_events(report_id, created_at desc);
create index on activity_events(actor_id, created_at desc);

alter table activity_events enable row level security;

create policy "report members read activity" on activity_events for select
  using (
    exists (
      select 1 from report_members rm
      where rm.report_id = activity_events.report_id
      and rm.user_id = auth.uid()
    )
    or exists (
      select 1 from reports r
      where r.id = activity_events.report_id
      and r.owner_id = auth.uid()
    )
  );

create policy "service role insert only" on activity_events for insert
  with check (false);

-- 5b. Notifications
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id),
  type        text not null,
  title       text not null,
  body        text not null,
  action_url  text,
  is_read     boolean not null default false,
  created_at  timestamptz default now()
);

create index on notifications(user_id, is_read, created_at desc);

alter table notifications enable row level security;

create policy "users read own notifications" on notifications for select
  using (auth.uid() = user_id);

create policy "users update own notifications" on notifications for update
  using (auth.uid() = user_id);

create policy "service role insert only" on notifications for insert
  with check (false);

-- ============================================================
-- 6. Full-Text Search Setup
-- ============================================================

alter table entry_snapshots
  add column search_vector tsvector
  generated always as (
    to_tsvector('indonesian', coalesce(note, '') || ' ' || coalesce(merchant, '') || ' ' || category)
  ) stored;

create index on entry_snapshots using gin(search_vector);

alter table entry_line_items
  add column search_vector tsvector
  generated always as (
    to_tsvector('indonesian', name)
  ) stored;

create index on entry_line_items using gin(search_vector);

-- ============================================================
-- 7. Stored Procedures
-- ============================================================

-- 7a. Edit Entry (immutable append)
create or replace function edit_entry(
  p_entry_id uuid,
  p_changed_by uuid,
  p_type entry_type,
  p_amount numeric,
  p_category text,
  p_note text,
  p_entry_date date
) returns void language plpgsql security definer as $$
declare
  v_version int;
begin
  select coalesce(max(version), 0) into v_version
  from entry_snapshots where entry_id = p_entry_id;

  update entry_snapshots
  set is_current = false
  where entry_id = p_entry_id and is_current = true;

  insert into entry_snapshots
    (entry_id, version, changed_by, action, type, amount, category, note, entry_date, is_current)
  values
    (p_entry_id, v_version + 1, p_changed_by, 'edit', p_type, p_amount, p_category, p_note, p_entry_date, true);
end;
$$;

-- 7b. Revert Entry (owner only)
create or replace function revert_entry(
  p_entry_id uuid,
  p_reverted_by uuid,
  p_target_version int
) returns void language plpgsql security definer as $$
declare
  v_source entry_snapshots%rowtype;
  v_version int;
begin
  select * into v_source
  from entry_snapshots
  where entry_id = p_entry_id and version = p_target_version;

  if not found then
    raise exception 'Version not found';
  end if;

  select coalesce(max(version), 0) into v_version
  from entry_snapshots where entry_id = p_entry_id;

  update entry_snapshots
  set is_current = false
  where entry_id = p_entry_id and is_current = true;

  insert into entry_snapshots
    (entry_id, version, changed_by, action, reverted_from, type, amount, category, note, entry_date, is_current)
  values
    (p_entry_id, v_version + 1, p_reverted_by, 'revert', p_target_version,
     v_source.type, v_source.amount, v_source.category, v_source.note, v_source.entry_date, true);
end;
$$;

-- ============================================================
-- 8. Default Categories Trigger
-- ============================================================

create or replace function insert_default_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into report_categories (report_id, name, emoji, is_default) values
    (new.id, 'Food & Dining', '🍔', true),
    (new.id, 'Transport', '🚗', true),
    (new.id, 'Utilities', '⚡', true),
    (new.id, 'Shopping', '🛍️', true),
    (new.id, 'Health', '❤️', true),
    (new.id, 'Entertainment', '🎬', true),
    (new.id, 'Other', '📦', true);
  return new;
end;
$$;

create trigger trg_report_categories_defaults
  after insert on reports
  for each row execute function insert_default_categories();

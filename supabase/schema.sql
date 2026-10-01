-- ─────────────────────────────────────────────────────────────────────────
-- Leadget schema. Paste into Supabase → SQL editor → Run. Safe to re-run.
--
-- Personal mode uses the data tables with workspace_id = 'personal'.
-- SaaS mode adds workspaces, memberships and usage (credits).
--
-- The app reads and writes through the service-role key on the server,
-- always pinned to one workspace_id. RLS is on for every table so the public
-- anon key can only ever see the signed-in person's own workspace.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Data ─────────────────────────────────────────────────────────────────
create table if not exists prospects (
  id text primary key,
  workspace_id text not null default 'personal',
  name text not null,
  industry text not null default 'other',
  country text not null default '',
  city text not null default '',
  address text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  contact_name text not null default '',
  contact_role text not null default '',
  linkedin text not null default '',
  size text not null default '',
  source text not null default 'manual',
  source_ref text not null default '',
  rating numeric,
  reviews integer,
  stage text not null default 'new',
  score integer not null default 0,
  deal_value numeric,
  tags text[] not null default '{}',
  notes text not null default '',
  audit jsonb,
  next_follow_up date,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table prospects add column if not exists workspace_id text not null default 'personal';
alter table prospects add column if not exists share_id text;
alter table prospects add column if not exists mockup jsonb;
alter table prospects add column if not exists views integer not null default 0;
alter table prospects add column if not exists last_viewed_at timestamptz;
alter table prospects add column if not exists report jsonb;
create unique index if not exists prospects_share_idx on prospects (share_id) where share_id is not null;
create index if not exists prospects_ws_idx on prospects (workspace_id, updated_at desc);
create index if not exists prospects_ws_follow_idx on prospects (workspace_id, next_follow_up);

create table if not exists activities (
  id text primary key,
  workspace_id text not null default 'personal',
  prospect_id text not null references prospects(id) on delete cascade,
  type text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);
alter table activities add column if not exists workspace_id text not null default 'personal';
create index if not exists activities_ws_idx on activities (workspace_id, prospect_id, created_at desc);

create table if not exists settings (
  workspace_id text primary key,
  data jsonb not null default '{}'
);

create table if not exists templates (
  id text primary key,
  workspace_id text not null default 'personal',
  name text not null,
  industry text not null default '',
  channel text not null default 'email',
  subject text not null default '',
  body text not null default '',
  category text not null default '',
  created_at timestamptz not null default now()
);
alter table templates add column if not exists workspace_id text not null default 'personal';
alter table templates add column if not exists category text not null default '';
create index if not exists templates_ws_idx on templates (workspace_id);

-- Businesses you removed, remembered by match key so searches don't bring them back.
create table if not exists suppressed (
  workspace_id text not null default 'personal',
  key text not null,
  name text not null default '',
  prospect_id text not null default '',
  removed_at timestamptz not null default now(),
  primary key (workspace_id, key)
);

-- Kymaa invoices. Kept when a prospect is deleted (they're your financial records).
create table if not exists invoices (
  id text primary key,
  workspace_id text not null default 'personal',
  share_id text not null unique,
  prospect_id text,
  number text not null default '',
  doc jsonb not null,
  views integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoices_ws_idx on invoices (workspace_id, created_at desc);
create index if not exists invoices_prospect_idx on invoices (workspace_id, prospect_id);

-- ── SaaS ─────────────────────────────────────────────────────────────────
create table if not exists workspaces (
  id text primary key,
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  plan_expires_at timestamptz,
  paystack_customer text,
  paystack_subscription text,
  paystack_email_token text,
  created_at timestamptz not null default now()
);
create index if not exists workspaces_customer_idx on workspaces (paystack_customer);

create table if not exists memberships (
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists memberships_user_idx on memberships (user_id);

create table if not exists usage (
  workspace_id text not null,
  period text not null,            -- '2026-09'
  searches integer not null default 0,
  audits integer not null default 0,
  ai integer not null default 0,
  primary key (workspace_id, period)
);

-- Spend credits atomically: returns false (and spends nothing) if it would go over the cap.
create or replace function spend_credits(ws text, per text, meter text, amount integer, cap integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare used integer;
begin
  if meter not in ('searches', 'audits', 'ai') then raise exception 'bad meter'; end if;
  insert into usage (workspace_id, period) values (ws, per) on conflict do nothing;
  execute format('select %I from usage where workspace_id = $1 and period = $2 for update', meter) into used using ws, per;
  if used + amount > cap then return false; end if;
  execute format('update usage set %I = %I + $3 where workspace_id = $1 and period = $2', meter, meter) using ws, per, amount;
  return true;
end $$;
revoke all on function spend_credits(text, text, text, integer, integer) from public, anon, authenticated;

-- ── Row-level security ───────────────────────────────────────────────────
create or replace function is_member(ws text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships m where m.workspace_id = ws and m.user_id = auth.uid());
$$;

alter table prospects enable row level security;
alter table activities enable row level security;
alter table settings enable row level security;
alter table templates enable row level security;
alter table workspaces enable row level security;
alter table memberships enable row level security;
alter table usage enable row level security;
alter table suppressed enable row level security;
alter table invoices enable row level security;

drop policy if exists "members" on prospects;
create policy "members" on prospects for all to authenticated using (is_member(workspace_id)) with check (is_member(workspace_id));
drop policy if exists "members" on activities;
create policy "members" on activities for all to authenticated using (is_member(workspace_id)) with check (is_member(workspace_id));
drop policy if exists "members" on settings;
create policy "members" on settings for all to authenticated using (is_member(workspace_id)) with check (is_member(workspace_id));
drop policy if exists "members" on templates;
create policy "members" on templates for all to authenticated using (is_member(workspace_id)) with check (is_member(workspace_id));
drop policy if exists "members" on suppressed;
create policy "members" on suppressed for all to authenticated using (is_member(workspace_id)) with check (is_member(workspace_id));
drop policy if exists "members" on invoices;
create policy "members" on invoices for all to authenticated using (is_member(workspace_id)) with check (is_member(workspace_id));
drop policy if exists "read own" on workspaces;
create policy "read own" on workspaces for select to authenticated using (is_member(id));
drop policy if exists "read own" on memberships;
create policy "read own" on memberships for select to authenticated using (user_id = auth.uid());
drop policy if exists "read own" on usage;
create policy "read own" on usage for select to authenticated using (is_member(workspace_id));
-- No insert/update policies on workspaces, memberships or usage: only the server changes plans and credits.

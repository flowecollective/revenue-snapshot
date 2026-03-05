-- ═══════════════════════════════════════
-- THE REVENUE SNAPSHOT — Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Users (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  website text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Audits (the core data — one per assessment)
create table public.audits (
  id text primary key, -- "audit_1234567890"
  user_id uuid references auth.users on delete cascade not null,
  business_name text,
  industry text,
  audit_data jsonb not null default '{}', -- all form inputs
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.audits enable row level security;
create policy "Users can CRUD own audits" on public.audits
  for all using (auth.uid() = user_id);

-- Purchases (the paywall — written by Stripe webhook only)
create table public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  audit_id text, -- null for platform purchases (they cover all audits)
  product text not null check (product in ('lift_plan', 'ai_engine', 'unlimited_monthly', 'unlimited_annual')),
  stripe_session_id text unique not null,
  stripe_customer_id text,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  created_at timestamptz default now(),
  expires_at timestamptz -- for subscriptions
);

alter table public.purchases enable row level security;

-- Users can READ own purchases (but never write — only the webhook writes)
create policy "Users can view own purchases" on public.purchases
  for select using (auth.uid() = user_id);

-- AI generations tracker
create table public.ai_generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  audit_id text not null,
  prompt_summary text,
  result_text text,
  created_at timestamptz default now()
);

alter table public.audits enable row level security;
create policy "Users can view own AI generations" on public.ai_generations
  for select using (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════
create index idx_purchases_user on public.purchases(user_id);
create index idx_purchases_audit on public.purchases(audit_id);
create index idx_purchases_product on public.purchases(product);
create index idx_audits_user on public.audits(user_id);
create index idx_ai_gens_audit on public.ai_generations(user_id, audit_id);

-- ═══════════════════════════════════════
-- HELPER FUNCTION: Check entitlement
-- Called from API routes via service role
-- ═══════════════════════════════════════
create or replace function public.check_entitlement(
  p_user_id uuid,
  p_audit_id text,
  p_product text
) returns boolean as $$
begin
  -- Platform subscribers have access to everything
  if exists (
    select 1 from public.purchases
    where user_id = p_user_id
    and product in ('unlimited_monthly', 'unlimited_annual')
    and status = 'active'
    and (expires_at is null or expires_at > now())
  ) then
    return true;
  end if;

  -- Per-audit purchases
  return exists (
    select 1 from public.purchases
    where user_id = p_user_id
    and audit_id = p_audit_id
    and product = p_product
    and status = 'active'
  );
end;
$$ language plpgsql security definer;

-- ═══════════════════════════════════════
-- QUIZ SESSIONS (archetype quiz data)
-- Saves quiz state before Stripe redirect
-- ═══════════════════════════════════════
create table public.quiz_sessions (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  name text,
  phone text,
  archetype text not null,
  secondary_type text,
  gene_key jsonb not null, -- {gate, name, shadow, gift, siddhi}
  birthday jsonb, -- {month, day, year, time}
  answers jsonb not null, -- quiz answer indices
  scores jsonb, -- type scores
  paid boolean default false,
  stripe_session_id text,
  created_at timestamptz default now()
);

create index idx_quiz_email on public.quiz_sessions(email);
-- No RLS needed - accessed via service role from API routes only

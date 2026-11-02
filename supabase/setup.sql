-- Run once in the SQL editor of YOUR Supabase project.
-- Only the signed-in owner can read or change their training history.
begin;
create table if not exists public.training_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'version' and payload->>'version' = '1' and octet_length(payload::text) <= 5000000),
  updated_at timestamptz not null default now()
);
alter table public.training_documents enable row level security;
revoke all on public.training_documents from anon;
revoke all on public.training_documents from authenticated;
grant select, insert, update on public.training_documents to authenticated;
drop policy if exists "Owner reads training" on public.training_documents;
create policy "Owner reads training" on public.training_documents for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Owner creates training" on public.training_documents;
create policy "Owner creates training" on public.training_documents for insert to authenticated with check ((select auth.uid()) = user_id and revision = 1);
drop policy if exists "Owner updates training" on public.training_documents;
create policy "Owner updates training" on public.training_documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create or replace function public.enforce_training_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.user_id <> old.user_id or new.revision <> old.revision + 1 then
    raise exception 'Stale or invalid training revision';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists training_revision on public.training_documents;
create trigger training_revision before update on public.training_documents for each row execute function public.enforce_training_revision();
commit;

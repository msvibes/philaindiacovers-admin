-- Root-cause fix, not just a symptom patch. Found via a real Google
-- sign-in with a brand-new email: no trigger has ever existed to create a
-- matching profiles row on signup, so every self-service account (Google
-- SSO today; email/password self-signup in the future consumer app,
-- FR-26/27/28) ends up with ZERO profiles row, not the schema's stated
-- `role text not null default 'collector'` — that default only applies to
-- an actual INSERT, and nothing ever performs one for a self-service
-- auth.users row. This is what let current_profile_role() return NULL
-- instead of 'collector', which is what exposed the verify_cover() NULL-
-- guard bug fixed in the previous migration.
--
-- Standard Supabase pattern: a SECURITY DEFINER trigger function on
-- auth.users, since an authenticated/anon caller has no direct INSERT
-- grant on public.profiles to do this themselves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'collector');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Downstream effect, deliberate: every place that creates an auth.users
-- row and then separately writes profiles.role (scripts/provision-user.mjs,
-- src/lib/testHelpers/createTestUser.ts) now runs against a row this
-- trigger already created — their own writes must upsert/update, not
-- insert, or they'll hit a duplicate-key conflict. Updated in the same
-- change as this migration, not left to fail and be discovered later.

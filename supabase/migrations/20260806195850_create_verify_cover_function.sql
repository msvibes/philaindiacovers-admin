-- T-06 (US-39, FR-22/FR-23): verification_audit_log table + verify_cover().
-- Per ADR-005: the Verifier role gets zero direct write grant on covers.
-- All verification actions go through this single SECURITY DEFINER
-- function, which performs exactly the allowed update and writes the
-- audit log atomically — a genuine DB-level guarantee, not a UI
-- restriction alone (per FR-25, RLS can't express column-level write
-- limits, so a narrow function stands in for one).

create table verification_audit_log (
  id uuid primary key default gen_random_uuid(),
  cover_id uuid not null references covers (id),
  action text not null check (action in ('verified', 'flagged', 'correction_resubmitted')),
  performed_by uuid not null references profiles (id),
  reason text,
  performed_at timestamptz not null default now()
);

-- Per ADR-007, "Enable automatic RLS" is checked project-wide, so this
-- table already got RLS-locked-down and grant-covered via the blanket
-- ALTER DEFAULT PRIVILEGES in 20260804175714 the moment it was created
-- (unlike covers, which predated that migration and needed its own
-- explicit grant). Enabling RLS explicitly here anyway, belt-and-suspenders.
alter table verification_audit_log enable row level security;

-- Per API-Integration-Contracts.md's RLS Policy Summary: Admin can view the
-- trail; Collector has no access; Verifier has no direct write (or read —
-- all writes happen exclusively inside verify_cover() below, which runs as
-- SECURITY DEFINER and so bypasses RLS on this table entirely, the same
-- pattern as covers' Verifier write path).
create policy "Admin can view the verification audit log"
on verification_audit_log
for select
to authenticated
using (current_profile_role() = 'admin');

create or replace function verify_cover(
  p_cover_id uuid,
  p_new_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_profile_role() <> 'verifier' then
    raise exception 'Only the Verifier role may call verify_cover()';
  end if;

  if p_new_status not in ('verified', 'flagged') then
    raise exception 'p_new_status must be ''verified'' or ''flagged'', got %', p_new_status;
  end if;

  if p_new_status = 'flagged' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'p_reason is required when flagging a cover';
  end if;

  update covers
  set verification_status = p_new_status,
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = p_cover_id;

  if not found then
    raise exception 'Cover % not found', p_cover_id;
  end if;

  insert into verification_audit_log (cover_id, action, performed_by, reason)
  values (p_cover_id, p_new_status, auth.uid(), p_reason);
end;
$$;

-- Anyone authenticated may attempt the call; the role check inside narrows
-- actual success to Verifier. No anon grant — no anon-facing use case here.
grant execute on function verify_cover(uuid, text, text) to authenticated;

-- Real security-correctness bug found while investigating a brand-new
-- Google-signup account (no profiles row at all, since nothing auto-
-- creates one — see the same-day handle_new_user() migration that closes
-- the root cause). verify_cover()'s guard was:
--
--   if current_profile_role() <> 'verifier' then raise exception ...
--
-- For a caller with no profiles row, current_profile_role() returns NULL.
-- In SQL, `NULL <> 'verifier'` evaluates to NULL, not TRUE — and PL/pgSQL
-- treats a NULL IF-condition as false, so the exception did NOT fire. The
-- call was NOT rejected by this guard.
--
-- Confirmed empirically (not assumed) that this was NOT actually
-- exploitable today: the subsequent `update covers set verified_by =
-- auth.uid()` hit covers_verified_by_fkey (references profiles(id)),
-- since a NULL-role caller has no profiles row for that FK to satisfy —
-- an accidental backstop, not the intended one. The call still failed and
-- rolled back atomically with no state change, but via the wrong
-- mechanism, producing a raw FK-violation error instead of the intended
-- "Only the Verifier role may call verify_cover()" message, and leaving
-- no real guarantee if the schema ever changes.
--
-- Fix: IS DISTINCT FROM is the SQL-correct way to compare against a
-- possibly-NULL value — unlike <>, `NULL IS DISTINCT FROM 'verifier'`
-- correctly evaluates to TRUE, so the guard now actually fires for a
-- role-less caller instead of silently passing through.
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
  if current_profile_role() is distinct from 'verifier' then
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

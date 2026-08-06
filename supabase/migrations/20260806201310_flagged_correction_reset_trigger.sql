-- T-06 (FR-24): a corrected Flagged entry returns to pending-review
-- (draft), not directly back to Verified — only the Verifier can re-mark
-- it Verified. verify_cover() alone can't enforce this: an Admin correcting
-- a Flagged cover's metadata does so via a plain UPDATE on covers (Admin
-- has full r/w per ADR-005/T-04), never through verify_cover(), which is
-- Verifier-only. This trigger is the DB-level backstop so a corrected
-- Flagged row can't just sit there — or worse, get left in a state an
-- Admin could later mark Verified without a fresh Verifier review.
--
-- Fires only when the actor is the Admin role (current_profile_role() =
-- 'admin'). A verify_cover() call is always made by the Verifier role (it
-- rejects anyone else), so this never fires on verify_cover()'s own
-- status-change UPDATE, including a Verifier re-flagging an
-- already-flagged cover with an updated reason (OLD/NEW both 'flagged',
-- but actor is 'verifier', not 'admin').
create or replace function reset_flagged_to_draft_on_admin_correction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.verification_status = 'flagged'
     and new.verification_status = 'flagged'
     and current_profile_role() = 'admin' then
    new.verification_status := 'draft';

    -- 'correction_resubmitted' exists in verification_audit_log's action
    -- check constraint specifically for this event (see
    -- 20260806195850_create_verify_cover_function.sql) — recording it here
    -- keeps FR-23's audit trail complete for this path too, not just the
    -- verify_cover() ones.
    insert into verification_audit_log (cover_id, action, performed_by)
    values (new.id, 'correction_resubmitted', auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_reset_flagged_to_draft_on_admin_correction
before update on covers
for each row
execute function reset_flagged_to_draft_on_admin_correction();

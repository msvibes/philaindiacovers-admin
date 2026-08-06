-- T-06 (FR-24 extension, §3.4): the correction-reset trigger originally
-- only covered Flagged rows. §3.4's guardrail requires catalogue accuracy
-- to hold on an ongoing basis, not just at first verification — an Admin's
-- plain metadata UPDATE on a Verified row is the same class of gap as the
-- Flagged one: without this, a Verified cover's data could drift out of
-- accuracy with the physical cover it describes and stay marked Verified
-- indefinitely, with no re-review ever triggered. Arguably worse than the
-- Flagged case, since Flagged is already a "needs attention" state and
-- Verified is the one collectors are shown as trustworthy.
--
-- Replace the function body first (trigger keeps working throughout, bound
-- by OID not name), then rename function + trigger from *_flagged_* to
-- *_reviewed_* since "reviewed" now covers both terminal review states
-- (flagged, verified) this trigger resets.

create or replace function reset_flagged_to_draft_on_admin_correction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.verification_status in ('flagged', 'verified')
     and new.verification_status = old.verification_status
     and current_profile_role() = 'admin' then
    new.verification_status := 'draft';
    insert into verification_audit_log (cover_id, action, performed_by)
    values (new.id, 'correction_resubmitted', auth.uid());
  end if;
  return new;
end;
$$;

alter function reset_flagged_to_draft_on_admin_correction()
  rename to reset_reviewed_to_draft_on_admin_correction;

alter trigger trg_reset_flagged_to_draft_on_admin_correction on covers
  rename to trg_reset_reviewed_to_draft_on_admin_correction;

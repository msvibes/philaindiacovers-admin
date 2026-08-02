---
description: Reconcile what's actually done (Jira + merged PRs) against PROGRESS.md, and report what's genuinely next.
allowed-tools: Bash, Read, Edit
---

# Standup: Reconcile Status

Run this at the START of every work session, before touching any code.

1. Run `git fetch origin` FIRST, before checking any local branch or commit state. Local refs can be stale — a branch may have been merged or deleted via the GitHub web UI since the last check — and every step below depends on accurate remote state, not a cached local view.
2. Run `git log --oneline -20`, `git branch -a`, and `git log --oneline main..origin/main` (or the equivalent for the current default branch) to see recent commits, any open branches, and whether local is behind origin.
3. If the GitHub CLI (`gh`) is available, run `gh pr list --state merged --limit 20` and `gh pr list --state open` to see recently merged and currently-open PRs.
4. Read `.claude/PROGRESS.md` if it exists.
5. Ask me (the user) to paste the current Jira board status for this project (To Do / In Progress / Done columns) if it isn't already obvious from the above — don't guess at it.
6. Compare all three: PROGRESS.md's claims, the git/PR evidence, and the Jira status I gave you.
7. Explicitly flag any disagreement — for example, a story PROGRESS.md calls "done" with no matching merged PR, or a merged PR for a story Jira still shows as "To Do."
8. Once reconciled, tell me clearly:
   - What's genuinely Done
   - What's genuinely In Progress (and where it was left off)
   - What the single most sensible Next task is, given priorities already set in the backlog
9. Do not start any new work until I've confirmed the reconciliation looks right.

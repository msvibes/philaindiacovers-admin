---
description: Reconcile what's actually done (Jira + merged PRs) against PROGRESS.md, and report what's genuinely next.
allowed-tools: Bash, Read, Edit
---

# Standup: Reconcile Status

Run this at the START of every work session, before touching any code.

1. Run `git log --oneline -20` and `git branch -a` to see recent commits and any open branches.
2. If the GitHub CLI (`gh`) is available, run `gh pr list --state merged --limit 20` and `gh pr list --state open` to see recently merged and currently-open PRs.
3. Read `.claude/PROGRESS.md` if it exists.
4. Ask me (the user) to paste the current Jira board status for this project (To Do / In Progress / Done columns) if it isn't already obvious from the above — don't guess at it.
5. Compare all three: PROGRESS.md's claims, the git/PR evidence, and the Jira status I gave you.
6. Explicitly flag any disagreement — for example, a story PROGRESS.md calls "done" with no matching merged PR, or a merged PR for a story Jira still shows as "To Do."
7. Once reconciled, tell me clearly:
   - What's genuinely Done
   - What's genuinely In Progress (and where it was left off)
   - What the single most sensible Next task is, given priorities already set in the backlog
8. Do not start any new work until I've confirmed the reconciliation looks right.

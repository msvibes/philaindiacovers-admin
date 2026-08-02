---
description: Close out a work session cleanly — update Jira, update PROGRESS.md, confirm the PR exists.
allowed-tools: Bash, Read, Edit
---

# Wrap Up This Session

Run this before ending a work session.

1. Run `git fetch origin` FIRST, before checking any local branch or commit state, and before pushing anything. Local refs can be stale — I may have merged a PR via the GitHub web UI mid-session without mentioning it — and pushing a new commit to a branch whose PR already merged will silently recreate a deleted branch as an orphan, disconnected from `main`. Confirm what's actually on `origin` (e.g. `git log --oneline main..origin/main`, `git branch -a` after the fetch) before doing anything else in this skill.
2. Confirm a Pull Request exists for any work done this session (ask me to run `gh pr create` if one doesn't exist yet, or confirm you already created one) — using the fetched state from step 1, not an assumption from earlier in the session.
3. Remind me to update the Jira ticket's status to match what was actually accomplished (To Do → In Progress → Done) — you cannot do this step yourself unless Jira is directly connected; treat it as a reminder to me, not an assumption that it's done.
4. Update `.claude/PROGRESS.md` with: which Story ID this session worked on, what specifically got done, and what the clear next step is.
5. Show me the updated PROGRESS.md content so I can confirm it's accurate before we close out.

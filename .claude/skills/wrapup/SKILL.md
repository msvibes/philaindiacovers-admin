---
description: Close out a work session cleanly — update Jira, update PROGRESS.md, confirm the PR exists.
allowed-tools: Bash, Read, Edit
---

# Wrap Up This Session

Run this before ending a work session.

1. Confirm a Pull Request exists for any work done this session (ask me to run `gh pr create` if one doesn't exist yet, or confirm you already created one).
2. Remind me to update the Jira ticket's status to match what was actually accomplished (To Do → In Progress → Done) — you cannot do this step yourself unless Jira is directly connected; treat it as a reminder to me, not an assumption that it's done.
3. Update `.claude/PROGRESS.md` with: which Story ID this session worked on, what specifically got done, and what the clear next step is.
4. Show me the updated PROGRESS.md content so I can confirm it's accurate before we close out.

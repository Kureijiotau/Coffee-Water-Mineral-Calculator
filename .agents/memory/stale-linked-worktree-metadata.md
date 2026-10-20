---
name: Stale linked worktree metadata
description: Safe cleanup when a linked worktree path loses its .git pointer.
---

When a linked worktree under `.worktrees/` appears prunable or its `.git` pointer is missing, `git worktree remove` can fail. Do not force-delete it. Check the matching admin metadata, try `git worktree repair <path>` when appropriate, then re-check the pointer and `git -C <path> status --short --untracked-files=all`. Remove it only after the pointer is valid and the worktree is clean. Avoid pruning unrelated worktrees.

**Why:** The worktree registration survived while its `.git` pointer was missing. Removal and repair initially failed; a later check showed the pointer available, allowing cleanup after confirming the worktree was clean.

**How to apply:** If cleanup fails because Git cannot validate a linked worktree, preserve its branch and files, inspect the worktree metadata, and re-check status before trying removal again. Never force removal to work around a missing pointer.

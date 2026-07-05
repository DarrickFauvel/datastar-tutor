---
description: Branch, commit, push, open a PR, and squash-merge it in one shot
allowed-tools: Bash(git status), Bash(git diff*), Bash(git log*), Bash(git checkout*), Bash(git switch*), Bash(git add*), Bash(git commit*), Bash(git push*), Bash(git branch*), Bash(git pull*), Bash(gh pr create*), Bash(gh pr merge*), Bash(gh pr view*)
---

Ship the current working changes end-to-end, fully automated — do not pause for confirmation between steps, that's the entire point of this command. Run:

1. `git status` and `git diff` (staged + unstaged) to see what changed. If there's nothing to ship (clean tree, nothing ahead of main), say so and stop.
2. If currently on `main`: create a new branch off it with a short kebab-case name based on the changes (e.g. `add-notes-create-route`). If already on a feature branch with uncommitted or unpushed work, stay on it.
3. Stage the relevant files (avoid `git add -A`/`.` if anything looks like it shouldn't be committed — e.g. secrets, stray build output) and commit with a concise message describing the *why*, following this repo's existing commit style (see `git log`). Add the `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer.
4. Push the branch to `origin` with `-u`.
5. Open a PR with `gh pr create`, with a short title and a body summarizing the change (use a HEREDOC for the body).
6. Squash-merge it immediately: `gh pr merge --squash --delete-branch`.
7. Switch back to `main` and `git pull` to sync up.
8. Report the PR URL and confirm the branch was deleted and `main` is up to date.

If any step fails (e.g. push rejected, merge conflict, CI failing check blocking merge), stop and report the failure clearly rather than forcing past it — do not use `--admin`, `-f`, or skip checks to push through a failure.

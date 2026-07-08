#!/bin/bash
# Auto-sync thoughts from Apple Notes → thoughts.json → GitHub
# Triggered by LaunchAgent when Notes database changes.
# Debounces for 5 minutes by waiting out the window (trailing edits are
# deferred, never dropped). Errors land in /tmp/sync-thoughts.log.
#
# Uses Homebrew git/python3 explicitly — Apple's /usr/bin/git is blocked
# by macOS TCC when launchd tries to access iCloud Drive paths.

export PATH="/opt/homebrew/bin:$PATH"

REPO_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Developments/personal-website"
STAMP_FILE="/tmp/sync-thoughts.lock"
MUTEX_DIR="/tmp/sync-thoughts.mutex"
LOG_FILE="/tmp/sync-thoughts.log"
DEBOUNCE=300  # 5 minutes in seconds

# Mutex: mkdir is atomic, so concurrent triggers (LaunchAgent + manual run)
# can't interleave git operations. The waiting instance simply exits — the
# running one will pick up its changes after the debounce sleep.
if ! mkdir "$MUTEX_DIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$MUTEX_DIR"' EXIT

# Debounce: sleep out the remainder of the window instead of skipping,
# so the last edit always syncs.
if [ -f "$STAMP_FILE" ]; then
  last_run=$(cat "$STAMP_FILE")
  now=$(date +%s)
  elapsed=$((now - last_run))
  if [ "$elapsed" -lt "$DEBOUNCE" ]; then
    sleep $((DEBOUNCE - elapsed))
  fi
fi

date +%s > "$STAMP_FILE"

cd "$REPO_DIR" || exit 1

if ! python3 sync-thoughts.py 2>>"$LOG_FILE"; then
  echo "$(date '+%F %T') sync-thoughts.py failed — aborting" >> "$LOG_FILE"
  exit 1
fi

# Commit if thoughts.json changed
if ! git diff --quiet thoughts.json 2>/dev/null; then
  git add thoughts.json
  git commit -m "sync: update thoughts from Apple Notes" >>"$LOG_FILE" 2>&1
fi

# Nothing to publish? (also catches a commit left unpushed by an earlier
# failed push — it goes out on this run instead of waiting for new edits)
if [ -z "$(git rev-list @{u}..HEAD 2>/dev/null)" ]; then
  exit 0
fi

# Stash other tracked changes — pull --rebase fails with a dirty working
# tree (e.g. books.json updated by GitHub Actions, uncommitted CLAUDE.md
# edits). Only pop if we actually stashed, or we'd pop someone else's stash.
stashed=0
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash --quiet >>"$LOG_FILE" 2>&1 && stashed=1
fi

if ! git pull --rebase >>"$LOG_FILE" 2>&1; then
  echo "$(date '+%F %T') pull --rebase failed — aborting rebase" >> "$LOG_FILE"
  git rebase --abort >>"$LOG_FILE" 2>&1
  [ "$stashed" -eq 1 ] && git stash pop --quiet >>"$LOG_FILE" 2>&1
  exit 1
fi

[ "$stashed" -eq 1 ] && git stash pop --quiet >>"$LOG_FILE" 2>&1

if ! git push >>"$LOG_FILE" 2>&1; then
  echo "$(date '+%F %T') push failed — commit stays local, retried next run" >> "$LOG_FILE"
  exit 1
fi

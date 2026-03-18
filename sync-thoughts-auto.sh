#!/bin/bash
# Auto-sync thoughts from Apple Notes → thoughts.json → GitHub
# Triggered by LaunchAgent when Notes database changes.
# Includes 5-minute debounce to avoid running too frequently.
#
# Uses Homebrew git/python3 explicitly — Apple's /usr/bin/git is blocked
# by macOS TCC when launchd tries to access iCloud Drive paths.

export PATH="/opt/homebrew/bin:$PATH"

REPO_DIR="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Developments/personal-website"
LOCK_FILE="/tmp/sync-thoughts.lock"
DEBOUNCE=300  # 5 minutes in seconds

# Debounce: skip if last run was less than 5 minutes ago
if [ -f "$LOCK_FILE" ]; then
  last_run=$(cat "$LOCK_FILE")
  now=$(date +%s)
  elapsed=$((now - last_run))
  if [ "$elapsed" -lt "$DEBOUNCE" ]; then
    exit 0
  fi
fi

# Write timestamp
date +%s > "$LOCK_FILE"

cd "$REPO_DIR" || exit 1

# Run sync script
python3 sync-thoughts.py 2>/dev/null

# Check if thoughts.json actually changed
if git diff --quiet thoughts.json 2>/dev/null; then
  exit 0
fi

# Commit and push
# Stash other changes first — pull --rebase fails with a dirty working tree
# (e.g. books.json updated by GitHub Actions, uncommitted CLAUDE.md edits)
git add thoughts.json
git commit -m "sync: update thoughts from Apple Notes"
git stash --quiet
git pull --rebase
git stash pop --quiet 2>/dev/null
git push

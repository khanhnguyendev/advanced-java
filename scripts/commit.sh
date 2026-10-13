#!/usr/bin/env bash
set -euo pipefail
msg="${1:?commit message required}"
git commit -m "$msg" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DBeGNR6YnfKc9qnqKeezyt"

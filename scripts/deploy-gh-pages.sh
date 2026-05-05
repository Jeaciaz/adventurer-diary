#!/usr/bin/env bash
set -euo pipefail

remote="${GH_PAGES_REMOTE:-origin}"
branch="${GH_PAGES_BRANCH:-gh-pages}"
workdir="$(mktemp -d)"
remote_url=""

cleanup() {
  rm -rf "$workdir"
}
trap cleanup EXIT

require_clean_worktree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    printf '%s\n' 'Working tree has uncommitted changes. Commit or stash before deploy.' >&2
    exit 1
  fi
}

build_pages() {
  GITHUB_PAGES=true npm run build
  touch dist/.nojekyll
}

resolve_remote_url() {
  remote_url="$(git remote get-url --push "$remote" 2>/dev/null || git remote get-url "$remote")"
  if [[ -z "$remote_url" ]]; then
    printf 'Remote %s not found. Set GH_PAGES_REMOTE or add git remote.\n' "$remote" >&2
    exit 1
  fi
}

publish_dist() {
  git init "$workdir"
  git -C "$workdir" checkout -b "$branch"
  cp -R dist/. "$workdir/"
  git -C "$workdir" add -A
  git -C "$workdir" commit -m "Deploy GitHub Pages"
  git -C "$workdir" push --force "$remote_url" "$branch"
}

require_clean_worktree
build_pages
resolve_remote_url
publish_dist

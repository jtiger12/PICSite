#!/usr/bin/env bash
# Runs ON the Hostinger VPS. .github/workflows/deploy.yml pipes it over ssh on
# every push to main; by hand, from a machine whose key is on the VPS:
#
#   ssh root@srv828657.hstgr.cloud 'bash -s' < scripts/deploy-vps.sh
#
# Clones or fast-forwards the repository under APP_DIR, then rebuilds the image
# and (re)starts the container with docker compose. Hostinger's Docker Manager
# lists compose projects by their file path, so it shows up in hPanel too.
#
# Settings (environment, all optional):
#   REPO_URL   git remote to deploy from   (default: the public GitHub repo)
#   BRANCH     branch to deploy            (default: main)
#   APP_DIR    checkout on the VPS         (default: /src/PICSite)
set -euo pipefail

main() {
    local repo_url="${REPO_URL:-https://github.com/jtiger12/PICSite.git}"
    local branch="${BRANCH:-main}"
    local app_dir="${APP_DIR:-/src/PICSite}"

    command -v git >/dev/null || { apt-get update -q && apt-get install -y -q git; }
    docker compose version >/dev/null

    if [ ! -d "$app_dir/.git" ]; then
        git clone --branch "$branch" "$repo_url" "$app_dir"
    fi
    cd "$app_dir"
    git remote set-url origin "$repo_url"
    git fetch --prune origin "$branch"
    git reset --hard "origin/$branch"
    echo "Deploying $(git log -1 --format='%h %s')"

    docker compose up -d --build --remove-orphans
    docker image prune -f >/dev/null
    docker compose ps
}

# The script arrives on stdin (`bash -s`), so nothing inside may read it.
main "$@" </dev/null

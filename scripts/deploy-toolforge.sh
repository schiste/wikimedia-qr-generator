#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/deploy-toolforge.sh [--dry-run|--apply] [--restart]

Deploy the static Wikimedia QR Generator files to Toolforge.

Environment:
  TOOLFORGE_LOGIN      SSH login name. Defaults to schiste.
  TOOLFORGE_TOOL       Tool account name. Defaults to wikimedia-qr-generator.
  TOOLFORGE_HOST       SSH host. Defaults to login.toolforge.org.
  TOOLFORGE_SSH_KEY    Optional local private key path.
  TOOLFORGE_TARGET     webservice, static, or both. Defaults to webservice.

Examples:
  TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge:dry-run
  TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge
  TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge:restart
EOF
}

mode="dry-run"
restart=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      mode="dry-run"
      ;;
    --apply)
      mode="apply"
      ;;
    --restart)
      restart=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

toolforge_login="${TOOLFORGE_LOGIN:-schiste}"
toolforge_tool="${TOOLFORGE_TOOL:-wikimedia-qr-generator}"
toolforge_host="${TOOLFORGE_HOST:-login.toolforge.org}"
toolforge_target="${TOOLFORGE_TARGET:-webservice}"
toolforge_ssh_key="${TOOLFORGE_SSH_KEY:-}"

if ! [[ "$toolforge_login" =~ ^[A-Za-z0-9._@-]+$ ]]; then
  echo "Invalid TOOLFORGE_LOGIN: $toolforge_login" >&2
  exit 2
fi

if ! [[ "$toolforge_tool" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Invalid TOOLFORGE_TOOL: $toolforge_tool" >&2
  exit 2
fi

if [[ "$toolforge_target" != "webservice" && "$toolforge_target" != "static" && "$toolforge_target" != "both" ]]; then
  echo "TOOLFORGE_TARGET must be webservice, static, or both." >&2
  exit 2
fi

if [[ -n "$toolforge_ssh_key" && ! -f "$toolforge_ssh_key" ]]; then
  echo "TOOLFORGE_SSH_KEY does not point to a readable file: $toolforge_ssh_key" >&2
  exit 2
fi

for command in ssh rsync; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command not found: $command" >&2
    exit 2
  fi
done

if [[ "$toolforge_login" == *@* ]]; then
  remote="$toolforge_login"
else
  remote="${toolforge_login}@${toolforge_host}"
fi

ssh_options=(-o ConnectTimeout=10)
if [[ -n "$toolforge_ssh_key" ]]; then
  ssh_options=(-i "$toolforge_ssh_key" -o IdentitiesOnly=yes "${ssh_options[@]}")
fi

ssh_transport="ssh"
for option in "${ssh_options[@]}"; do
  printf -v quoted_option "%q" "$option"
  ssh_transport+=" ${quoted_option}"
done

rsync_options=(-az --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r)
if [[ "$mode" == "dry-run" ]]; then
  rsync_options+=(--dry-run --itemize-changes)
fi
rsync_remote_path="become ${toolforge_tool} rsync"

site_filter_options=(
  --delete
  --delete-excluded
  --include=/index.html
  --include=/styles.css
  --include=/favicon.svg
  --include=/robots.txt
  --include=/healthz
  --include=/src/***
  --exclude=*
)

remote_project="/data/project/${toolforge_tool}"
webservice_dir="${remote_project}/public_html"
static_dir="${remote_project}/www/static"

run_ssh() {
  ssh "${ssh_options[@]}" "$remote" "$@"
}

run_ssh_as_tool() {
  run_ssh become "$toolforge_tool" "sh -c '$1'"
}

remote_dir_exists() {
  run_ssh_as_tool "test -d '$1'"
}

ensure_remote_dir() {
  local remote_dir="$1"
  if [[ "$mode" == "dry-run" ]]; then
    echo "Dry run: would ensure ${remote}:${remote_dir}/ exists"
    return
  fi
  run_ssh_as_tool "mkdir -p '${remote_dir}'"
}

run_site_rsync() {
  local destination="$1"

  if [[ "$mode" == "dry-run" ]]; then
    if remote_dir_exists "$destination"; then
      :
    else
      remote_status=$?
      if [[ "$remote_status" -eq 255 ]]; then
        echo "Dry run failed: could not connect to ${remote}." >&2
        exit 2
      fi
      echo "Dry run: ${remote}:${destination}/ does not exist yet; --apply would create it before syncing."
      return
    fi
  fi

  rsync "${rsync_options[@]}" "${site_filter_options[@]}" --rsync-path="$rsync_remote_path" -e "$ssh_transport" ./ "${remote}:${destination}/"
}

run_file_rsync() {
  local destination="$1"
  shift

  rsync "${rsync_options[@]}" --rsync-path="$rsync_remote_path" -e "$ssh_transport" "$@" "${remote}:${destination}/"
}

sync_site_to() {
  local remote_dir="$1"
  echo "Syncing site files to ${remote}:${remote_dir}/ (${mode})"
  ensure_remote_dir "$remote_dir"
  run_site_rsync "$remote_dir"
}

sync_service_template() {
  echo "Syncing Toolforge service.template to ${remote}:${remote_project}/service.template (${mode})"
  ensure_remote_dir "$remote_project"
  run_file_rsync "$remote_project" toolforge/service.template
}

case "$toolforge_target" in
  webservice)
    sync_site_to "$webservice_dir"
    sync_service_template
    ;;
  static)
    sync_site_to "$static_dir"
    ;;
  both)
    sync_site_to "$webservice_dir"
    sync_service_template
    sync_site_to "$static_dir"
    ;;
esac

if [[ "$restart" -eq 1 ]]; then
  if [[ "$mode" == "dry-run" ]]; then
    echo "Dry run: would restart webservice for tool ${toolforge_tool}."
  else
    echo "Restarting Toolforge webservice for ${toolforge_tool}."
    run_ssh become "$toolforge_tool" "toolforge webservice restart || toolforge webservice start"
  fi
fi

if [[ "$mode" == "dry-run" ]]; then
  echo "Dry run complete. Re-run with --apply to deploy."
else
  echo "Deploy complete."
  if [[ "$toolforge_target" == "webservice" || "$toolforge_target" == "both" ]]; then
    echo "Webservice URL: https://${toolforge_tool}.toolforge.org/"
  fi
  if [[ "$toolforge_target" == "static" || "$toolforge_target" == "both" ]]; then
    echo "Static URL: https://tools-static.wmflabs.org/${toolforge_tool}/"
  fi
fi

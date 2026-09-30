#!/usr/bin/env bash
# Secret scan with gitleaks (pinned below, fetched once into the main checkout's git-ignored tools/bin/).
#
#   tools/check/secrets.sh range <revision range>   scan the commits in a range, e.g. origin/main..main (pre-push hook)
#   tools/check/secrets.sh dir <folder>           scan the files in a folder (deploy-pages.sh, on the staged site)
#   tools/check/secrets.sh install                just fetch the binary
#
# Rules: gitleaks' built-in set (GitHub, OpenAI, Anthropic, Cloudflare, private key blocks, generic keys, ...) plus
# .gitleaks.toml (R2, Civitai, OpenRouter, Replicate, Meshy, .env files and KEY=value lines). On top, every value
# of a *KEY*, *TOKEN*, *SECRET* or *PASSWORD* variable in the local .env is searched for literally; those values go
# into a private temporary rule file that is deleted afterwards. Findings are printed redacted.
# Exit 0 clean, 1 secrets found, 2 the scan could not run.
set -uo pipefail
VERSION=8.30.1
SHA256=551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  # gitleaks_8.30.1_linux_x64.tar.gz

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
rules="$(cd "$here/../.." && pwd)/.gitleaks.toml"  # the rules next to this script (hooks run the main checkout's copy)
repo=$(git rev-parse --show-toplevel) || die "run it inside the repo"  # the checkout whose commits are scanned
main=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
bin="$main/tools/bin/gitleaks"
die() { echo "secrets: $*" >&2; exit 2; }

install() {
  if command -v gitleaks >/dev/null && [[ "$(gitleaks version 2>/dev/null)" == *"$VERSION"* ]]; then bin=$(command -v gitleaks); return; fi
  [[ -x "$bin" && "$("$bin" version 2>/dev/null)" == *"$VERSION"* ]] && return
  local tmp; tmp=$(mktemp -d /tmp/claude-1000/gitleaks-XXXXXX) || die "no temp folder"
  echo "secrets: fetching gitleaks $VERSION" >&2
  curl -fsSL -m 120 -o "$tmp/g.tgz" \
    "https://github.com/gitleaks/gitleaks/releases/download/v$VERSION/gitleaks_${VERSION}_linux_x64.tar.gz" \
    || { rm -rf "$tmp"; die "could not download gitleaks $VERSION"; }
  echo "$SHA256  $tmp/g.tgz" | sha256sum -c --quiet - || { rm -rf "$tmp"; die "gitleaks download failed its sha256 check"; }
  mkdir -p "$(dirname "$bin")" && tar -xzf "$tmp/g.tgz" -C "$tmp" gitleaks && mv "$tmp/gitleaks" "$bin" && chmod +x "$bin"
  rm -rf "$tmp"
}

config() {  # the repo rules plus a literal rule for the local .env values
  local cfg; cfg=$(mktemp /tmp/claude-1000/gitleaks-XXXXXX.toml) || die "no temp file"
  chmod 600 "$cfg"
  python3 - "$rules" "$main/.env" > "$cfg" <<'PY' || die "could not build the rule file"
import re, sys
base, env = sys.argv[1], sys.argv[2]
print(f"[extend]\npath = '''{base}'''\n")
values = []
try:
    for line in open(env):
        m = re.match(r'\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$', line)
        if not m or not re.search(r'KEY|TOKEN|SECRET|PASS', m.group(1).upper()): continue
        v = m.group(2).strip().strip('"\'')
        if len(v) >= 12: values.append(re.escape(v))
except OSError: pass
if values:
    print("[[rules]]\nid = 'local-env-value'\ndescription = 'A value from the local .env'")
    print("regex = '''(" + "|".join(values) + ")'''")
PY
  echo "$cfg"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  install) install; echo "secrets: gitleaks $VERSION at $bin"; exit 0 ;;
  range|dir) ;;
  *) die "usage: tools/check/secrets.sh range <range> | dir <folder> | install" ;;
esac
[[ -n "${1:-}" ]] || die "$cmd needs an argument"
install
cfg=$(config) || exit 2
trap 'rm -f "$cfg"' EXIT
opts=(--no-banner --no-color --verbose --redact --exit-code 3 --config "$cfg")  # 3 = leaks, anything else = error
if [[ "$cmd" == range ]]; then
  "$bin" git "${opts[@]}" --log-opts="$1" "$repo"
else
  "$bin" dir "${opts[@]}" "$1"
fi
status=$?
case $status in
  0) echo "secrets: no leaks ($cmd $1)" ;;
  3) status=1; echo "secrets: LEAKS FOUND ($cmd $1). Rewrite the commits that add them (a later commit that deletes the key is not enough: the push carries the whole history), and rotate the key if it ever left this machine. A false alarm: add a gitleaks:allow comment on that line." >&2 ;;
  *) echo "secrets: gitleaks failed (status $status)" >&2; exit 2 ;;
esac
exit $status

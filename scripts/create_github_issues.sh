#!/usr/bin/env bash
# Az 1. heti issue-k feltöltése GitHubra a docs/het-01/issues/*.md fájlokból.
#
# Használat (a repó gyökeréből, bejelentkezett gh CLI-vel: `gh auth login`):
#   A_USER=githubnev1 B_USER=githubnev2 C_USER=githubnev3 ./scripts/create_github_issues.sh
#
# Friss repóban futtasd, hogy az issue-k sorszáma (#1–#10) egyezzen a leírásokban szereplő hivatkozásokkal.
set -euo pipefail

cd "$(dirname "$0")/.."
MILESTONE="1. hét – Működő alap"
ISSUE_DIR="docs/het-01/issues"

field() { # field <fájl> <kulcs> — érték a fájl eleji --- blokkból
  awk -v key="$2" 'NR==1 && $0=="---" {inside=1; next} inside && $0=="---" {exit}
    inside && index($0, key ":")==1 {sub("^" key ":[ ]*", ""); gsub(/^"|"$/, ""); print}' "$1"
}
body() { # a fájl tartalma a --- blokk után
  awk 'NR==1 && $0=="---" {inside=1; next} inside && $0=="---" {inside=0; started=1; next} started' "$1"
}

echo "Címkék létrehozása…"
for label in "A:1f6feb" "B:8250df" "C:bf8700" "adat:0e8a16" "csillagászat:5319e7" "infra:6e7781" \
             "auth:d93f0b" "ui:fbca04" "render:1d76db" "teszt:c2e0c6" "dokumentáció:0075ca"; do
  gh label create "${label%%:*}" --color "${label##*:}" --force >/dev/null
done

echo "Mérföldkő: $MILESTONE"
gh api "repos/{owner}/{repo}/milestones" -f title="$MILESTONE" \
  -f description="Elindítható váz: bejelentkezés, élő égbolt, két kultúra" >/dev/null 2>&1 || true

for file in "$ISSUE_DIR"/*.md; do
  title=$(field "$file" title)
  labels=$(field "$file" labels | tr -d ' ')
  role=$(field "$file" assignee)
  user_var="${role}_USER"
  assignee="${!user_var:-}"
  echo "→ $title"
  args=(--title "$title" --body "$(body "$file")" --label "$labels" --milestone "$MILESTONE")
  [[ -n "$assignee" ]] && args+=(--assignee "$assignee")
  gh issue create "${args[@]}" >/dev/null
done
echo "Kész: $(ls "$ISSUE_DIR"/*.md | wc -l) issue."

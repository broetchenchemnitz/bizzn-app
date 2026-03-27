#!/usr/bin/env bash
# =============================================================================
# merge-all-hotfixes.sh
# Bizzn.de — Konsolidierter Merge aller Safari/UI-Fix-Branches in main
#
# STATUS: BEREIT — noch nicht ausführen! Warten auf "APPROVED ✅" von Gem 4 QA.
#
# Ausführen:
#   chmod +x merge-all-hotfixes.sh
#   ./merge-all-hotfixes.sh
#
# Merge-Reihenfolge (Abhängigkeiten beachtet):
#   1. feature/ui-design-integration  — UI patches (Wolt-style, rounded-3xl)
#   2. fix/ios-sticky-header-stacking — z-index + backdrop base
#   3. fix/ios-safari-rendering       — isolation:isolate, rgba, @supports
#   4. hotfix/ios-safari-render-events — StickyHeader.tsx + double-rAF VRAM
#   5. hotfix/ios-backdrop-filter     — @supports 'none' syntax + vendor prefixes
#   6. hotfix/ios-render-blocker-v2   — translate3d + strict fallback + z-index
#
# Bei Merge-Konflikt bricht das Script ab (set -e) und zeigt den Branch an.
# =============================================================================

set -euo pipefail

MAIN_BRANCH="main"
REMOTE="origin"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Merge-Reihenfolge — von Basis nach spezifisch
BRANCHES=(
  "feature/ui-design-integration"
  "fix/ios-sticky-header-stacking"
  "fix/ios-safari-rendering"
  "hotfix/ios-safari-render-events"
  "hotfix/ios-backdrop-filter"
  "hotfix/ios-render-blocker-v2"
)

# ── Pre-flight checks ─────────────────────────────────────────────────────────
log "Pre-flight: Sicherstellen, dass working directory sauber ist..."
if [ -n "$(git status --porcelain)" ]; then
  fail "Working directory ist nicht sauber. Bitte 'git stash' oder commit ausführen."
fi

log "Wechsel zu '$MAIN_BRANCH' und pull..."
git checkout "$MAIN_BRANCH"
git pull "$REMOTE" "$MAIN_BRANCH"

# ── Branch-Merges ─────────────────────────────────────────────────────────────
for BRANCH in "${BRANCHES[@]}"; do
  echo ""
  warn "Merge: $BRANCH → $MAIN_BRANCH"

  # Fetch latest
  git fetch "$REMOTE" "$BRANCH"

  # Squash-merge für saubere History: ein Commit pro Branch
  git merge --squash "$REMOTE/$BRANCH" || {
    fail "Merge-Konflikt bei Branch '$BRANCH'. Resolve conflicts, dann script neu starten ab diesem Branch."
  }

  # Commit mit Branch-Name im Message
  git commit -m "merge: squash $BRANCH into $MAIN_BRANCH" --no-edit || {
    warn "Kein Commit nötig für $BRANCH (bereits in main enthalten)."
  }

  log "Branch '$BRANCH' erfolgreich in $MAIN_BRANCH gemergt."
done

# ── Build-Validierung ─────────────────────────────────────────────────────────
echo ""
log "Starte Lint + Build-Validierung nach Merge..."
npm run lint || { git reset --hard HEAD~"${#BRANCHES[@]}"; fail "Lint-Fehler nach Merge! Rollback ausgeführt."; }
npm run build || { git reset --hard HEAD~"${#BRANCHES[@]}"; fail "Build-Fehler nach Merge! Rollback ausgeführt."; }

# ── Push main ────────────────────────────────────────────────────────────────
echo ""
log "Push '$MAIN_BRANCH' zu $REMOTE..."
git push "$REMOTE" "$MAIN_BRANCH"

# ── Cleanup: gemergte Branches löschen ───────────────────────────────────────
echo ""
warn "Remote-Branches aufräumen..."
for BRANCH in "${BRANCHES[@]}"; do
  git push "$REMOTE" --delete "$BRANCH" 2>/dev/null && log "Remote branch '$BRANCH' gelöscht." || warn "Branch '$BRANCH' war bereits gelöscht."
done

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
log "MERGE ABGESCHLOSSEN ✅"
echo "  Branches: ${#BRANCHES[@]} in $MAIN_BRANCH gemergt"
echo "  Build:    Exit 0"
echo "  Remote:   $REMOTE/$MAIN_BRANCH gepusht"
echo "  Cleanup:  Remote-Branches gelöscht"
echo "════════════════════════════════════════"
echo ""
echo "  Nächster Schritt: Vercel deployed automatisch via GitHub Push."
echo "  Monitor: https://vercel.com/dashboard"
echo ""

#!/usr/bin/env bash
# Watch pxotoken.com's TLS certificate through the renewal window.
#
# Context (DEP-007, docs/DEPLOY_BACKLOG.md): when the domain was recovered from a
# departed developer's Vercel account on 2026-09-02, Vercel did not issue a new
# certificate. The edge kept serving the *previous account's* wildcard cert
# (serial 056CDCBCB57EF5371424F7DB89080FF2A7E0, expires 2026-11-14).
#
# That works today. The open question is whether Vercel provisions its own cert
# before the old one lapses. Let's Encrypt renews ~30 days out, so the decision
# point is mid-October. If nothing is issued, the site fails on 2026-11-14 with
# an expired cert on a live production domain.
#
# This exits non-zero once that becomes actionable, so it can drive an alert.
#
# Usage: scripts/check-cert-renewal.sh [domain]
# Exit:  0 = renewed, or still early    1 = needs attention    2 = urgent/broken

set -uo pipefail

DOMAIN="${1:-${CERT_CHECK_DOMAIN:-pxotoken.com}}"
LEGACY_SERIAL="056CDCBCB57EF5371424F7DB89080FF2A7E0"
WARN_DAYS="${CERT_WARN_DAYS:-30}"
CRIT_DAYS="${CERT_CRIT_DAYS:-10}"

echo "== TLS certificate check: ${DOMAIN} =="
echo "   $(date -u '+%Y-%m-%d %H:%M UTC')"
echo

cert="$(echo | openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" 2>/dev/null \
        | openssl x509 -noout -subject -issuer -serial -dates 2>/dev/null)"

if [ -z "${cert}" ]; then
  echo "CRITICAL: could not retrieve a certificate from ${DOMAIN}:443"
  echo "          The site may be down, or TLS termination is broken."
  exit 2
fi

serial="$(sed -n 's/^serial=//p'    <<< "${cert}")"
issuer="$(sed -n 's/^issuer=//p'    <<< "${cert}")"
not_after="$(sed -n 's/^notAfter=//p' <<< "${cert}")"
not_before="$(sed -n 's/^notBefore=//p' <<< "${cert}")"

# Cross-platform epoch parse (GNU date vs BSD/macOS date).
expiry_epoch="$(date -d "${not_after}" +%s 2>/dev/null \
             || date -j -f "%b %d %T %Y %Z" "${not_after}" +%s 2>/dev/null)"
now_epoch="$(date -u +%s)"

if [ -n "${expiry_epoch}" ]; then
  days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
else
  days_left="unknown"
fi

echo "Serving now:"
echo "  issuer     ${issuer}"
echo "  serial     ${serial}"
echo "  valid      ${not_before} -> ${not_after}"
echo "  days left  ${days_left}"
echo

# Certificate Transparency: has anything been issued since the recovery?
echo "Certificate Transparency (crt.sh):"
ct="$(curl -sS --max-time 25 "https://crt.sh/?q=${DOMAIN}&output=json" 2>/dev/null)"
newest=""
if [ -n "${ct}" ]; then
  newest="$(printf '%s' "${ct}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit()
rows = sorted({(c.get('not_before',''), c.get('common_name',''), c.get('issuer_name','')[:40]) for c in d}, reverse=True)
for r in rows[:5]:
    print(f'  {r[0]}  {r[1]:<22} {r[2]}')
print('NEWEST=' + (rows[0][0] if rows else ''))
" 2>/dev/null)"
  printf '%s\n' "${newest}" | grep -v '^NEWEST='
  newest="$(printf '%s' "${newest}" | sed -n 's/^NEWEST=//p')"
else
  echo "  (crt.sh unavailable — relying on the served certificate only)"
fi
echo

# --- verdict -------------------------------------------------------------
if [ "${serial}" != "${LEGACY_SERIAL}" ]; then
  echo "OK: a new certificate is being served (serial differs from the legacy one)."
  echo "    Vercel has provisioned its own cert. DEP-007 can be closed, and the"
  echo "    CAA records (letsencrypt.org, pki.goog, sectigo.com) are now safe to restore."
  exit 0
fi

echo "Still serving the legacy certificate inherited from the previous Vercel account."

if [ "${days_left}" = "unknown" ]; then
  echo "WARN: could not compute days remaining — check ${not_after} by hand."
  exit 1
fi

if [ "${days_left}" -le "${CRIT_DAYS}" ]; then
  echo "CRITICAL: ${days_left} days to expiry and no replacement has been issued."
  echo "          Act now. In Vercel: Project -> Settings -> Domains. Removing and"
  echo "          re-adding ${DOMAIN} forces issuance (brief downtime). Confirm no"
  echo "          CAA record is blocking the CA before retrying."
  exit 2
fi

if [ "${days_left}" -le "${WARN_DAYS}" ]; then
  echo "WARN: ${days_left} days to expiry, inside the renewal window, still no new cert."
  echo "      Vercel should have renewed by now. Check Project -> Settings -> Domains"
  echo "      for the certificate status and any error shown against the domain."
  exit 1
fi

echo "Early: ${days_left} days to expiry, outside the ~${WARN_DAYS}-day renewal window."
echo "       Nothing to do yet. Renewal is expected around mid-October."
exit 0

#!/bin/bash
# Dubbelklik dit bestand om R7N SEO Studio te starten (Mac).
cd "$(dirname "$0")" || exit 1
clear
echo ""
echo "  R7N SEO Studio"
echo "  ──────────────────────────────────────────"
echo ""
if ! command -v npm >/dev/null 2>&1; then
  echo "  Node.js staat nog niet op deze computer."
  echo "  1. Ga naar https://nodejs.org en download de LTS-versie."
  echo "  2. Installeer die en dubbelklik daarna opnieuw op dit bestand."
  echo ""
  read -r -p "  Druk op Enter om te sluiten."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "  Eerste keer: de studio installeert zichzelf (1 à 3 minuten)…"
  echo ""
  npm install --no-fund --no-audit || { echo ""; echo "  Installeren lukte niet. Controleer je internet en probeer opnieuw."; read -r -p "  Druk op Enter om te sluiten."; exit 1; }
fi
PORT="${PORT:-3000}"
echo ""
echo "  De studio start op http://localhost:$PORT"
echo "  Je browser opent zo vanzelf. Laat dit venster open zolang je werkt."
echo "  Stoppen: klik in dit venster en druk op Ctrl + C."
echo ""
( sleep 6 && open "http://localhost:$PORT" ) &
PORT="$PORT" npm run dev

# R7N SEO Studio — instructies voor Claude Code

Dit is **R7N SEO Studio**, een lokale web-app (Next.js) van R7N Growth. De gebruiker zoekt er SEO-kansen mee, laat blogs schrijven en zet ze op zijn eigen website (WordPress, Shopify of een ander platform). Alles draait op de eigen computer; gegevens staan in de map `data/`.

## Als de gebruiker zegt "open de localhost" (of "start de studio")
1. Controleer of Node.js er is (`node -v`). Zo niet: leg uit dat ze de LTS-versie van https://nodejs.org moeten installeren.
2. Staat er geen `node_modules`? Voer `npm install` uit.
3. Start de app met de previewtool (configuratie `r7n-seo-studio` in `.claude/launch.json`) of met `npm run dev`, en open http://localhost:3000.
4. De eerste keer opent de wizard (`/start`): website-adres, OpenRouter-sleutel, profiel, koppeling met de website.

## Belangrijk
- Vul nooit zelf sleutels of wachtwoorden in (OpenRouter, DataForSEO, WordPress, Shopify). De gebruiker plakt die zelf in de app.
- `data/` bevat de sleutels van de gebruiker: niet delen, niet committen (staat in `.gitignore`).
- Uitleg voor gebruikers staat in de app onder "Hoe werkt het" en in `docs/SOP.md`.
- WordPress-plugin voor de opmaak: `wordpress-plugin/r7n-blog.zip`.
- Gebruiksvoorwaarden: `LICENSE.md` (R7N-licentie).

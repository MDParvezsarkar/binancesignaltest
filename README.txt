CRYPTO TRACKER + BUSINESS PLANNER - FULL PROJECT (upload everything in this folder to your GitHub repo)

FILES
  index.html                      The website (GitHub Pages)
  smc.js                          Signal engine (must be next to index.html)
  alerts.mjs                      Telegram alert script (GitHub Actions)
  coins.json                      Your coins for Telegram alerts (website button "Copy settings for Telegram alerts" fills it)
  state.json                      Alert memory (leave as is)
  .github/workflows/alerts.yml    Runs alerts.mjs every ~5 minutes

WEBSITE FEATURES
  Live prices | BUY/SELL/HOLD signals | every buy tracked + average | partial sell
  Market Scanner | Top Coins Plan | Smart Money Signals | Movers 1h/12h/24h
  Business Planner: 12-month simulation, capital ledger, position sizing, loss limits, roadmap
  My Stats + Risk dashboard + Backup/Restore | Price alerts | Notifications | Fear & Greed | Auto-update

HOW TO UPDATE
  1. FIRST open the old site > My Stats > Download backup (your data lives in the browser).
  2. In your GitHub repo, delete the old files.
  3. Add file > Upload files. Drag in ALL files and folders (also the hidden .github folder).
     If .github will not upload: Add file > Create new file, name it .github/workflows/alerts.yml and paste that file's content.
  4. Settings > Pages > Deploy from branch: main (root). Wait 1-2 minutes. Then Restore backup.

TELEGRAM ALERTS (optional)
  Create a bot with @BotFather, get the token. Message your bot, open
  https://api.telegram.org/bot<TOKEN>/getUpdates to find your chat id.
  Repo Settings > Secrets and variables > Actions: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
  Actions tab > Crypto alerts > Run workflow to test.

Signals are analysis, not financial advice or a guarantee of profit.

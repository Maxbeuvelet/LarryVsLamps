# Larry vs Lamps

A head-to-head analytics dashboard for two YouTube channels. It shows who is ahead on subscribers, views and engagement, ranks every video, and explains why each one did well or badly.

## Files

| File | What it is |
|---|---|
| `dashboard.html` | The dashboard. Published as a shareable Claude artifact; both of you open the same link. |
| `youtube-sync.html` | A local helper page. Fetches both channels from the YouTube Data API and produces a JSON file to import. |

## One-time setup

1. Get a free YouTube Data API key (about 3 minutes):
   1. Go to https://console.cloud.google.com and create a project.
   2. APIs & Services → Library → search "YouTube Data API v3" → Enable.
   3. APIs & Services → Credentials → Create credentials → API key.
   4. Leave "Application restrictions" as None so the local sync page can use it. Optionally restrict the key to the YouTube Data API only.
2. Open `youtube-sync.html` in your browser (double-click it). Paste the key and both channel handles. They are remembered in that browser.

## Refreshing the numbers

1. Open `youtube-sync.html` → Fetch both channels → Copy to clipboard (or Download JSON).
2. Open the dashboard link → Import data → YouTube data (JSON) → paste or choose the file → Import.
3. Each import adds one point to the growth lines, so import daily or every few days for a good curve. Either of you can do it.

## Adding YouTube Studio metrics (CTR, retention)

Public data does not include impressions, click-through rate or retention, and those are the two numbers that explain most hits. Each of you exports them from your own Studio:

1. YouTube Studio → Analytics → Advanced mode.
2. Content tab. Add the columns Impressions, Impressions click-through rate, Average view duration, Average percentage viewed.
3. Set the date range to Lifetime (or the range you care about) → Export → CSV.
4. In the dashboard: Import data → YouTube Studio CSV → choose `Table data.csv` from the export → Import.

Rows are matched to videos by video ID, so import the JSON first. The "Packaging vs content" chart and the CTR / retention signals appear once Studio data is in.

## Notes

- Shorts are detected by length (up to 180 seconds by default, changeable in Settings). Any single video can be overridden from its details panel.
- "Why it did what it did" compares each video against the median of comparable uploads on the same channel: same format when there are at least three of them, otherwise the whole channel.
- The dashboard shows clearly labelled sample data until the first import.
- Data is stored in the artifact's shared database, so both of you see the same numbers. If that storage is unavailable, the page falls back to the browser's local storage.

## Links

- Dashboard artifact: https://claude.ai/code/artifact/87305d9a-7741-40d4-a090-38a789292d69
- Update guide artifact: https://claude.ai/code/artifact/0bf27ee0-305b-4b49-840d-6d02eff00b4c

To change either page from a new Claude Code session on another PC, publish the edited file with `url` set to the link above so it updates in place rather than creating a new artifact.

# Larry vs Lamps

A head-to-head analytics dashboard for two YouTube channels: larryRBLX (Channel A) and LampsGaming (Channel B). It shows who is ahead on subscribers, views and engagement, ranks every video, and explains why each one did well or badly.

**Dashboard:** https://maxbeuvelet.github.io/LarryVsLamps/

## How it stays up to date

A GitHub Actions job (`.github/workflows/sync.yml`) runs every day at 6:00 AM New York time. It fetches both channels from the YouTube Data API, merges the numbers into `data/db.json`, and commits the result. GitHub Pages then serves the updated dashboard. Each run adds one point to the growth lines.

The job needs one secret: **YOUTUBE_API_KEY**. Set it once at Settings → Secrets and variables → Actions → New repository secret. Without it the job still runs but only rebuilds from existing data.

To run it by hand: Actions tab → "Sync YouTube data" → Run workflow.

## Adding YouTube Studio metrics (CTR, retention)

Public data does not include impressions, click-through rate or retention, and those explain most hits. Each channel owner exports them from their own Studio:

1. YouTube Studio → Analytics → Advanced mode → Content tab.
2. Add the columns Impressions, Impressions click-through rate, Average view duration, Average percentage viewed.
3. Date range: Lifetime → Export → CSV. Unzip to find `Table data.csv`.
4. Upload it to `data/studio/a/` (Channel A) or `data/studio/b/` (Channel B), either with git or on github.com via Add file → Upload files. Any `.csv` name works; a newer file (alphabetically later) overrides an older one.

The upload triggers the sync job, and the dashboard rebuilds within a few minutes.

## Files

| Path | What it is |
|---|---|
| `index.html` | The dashboard. Reads `data/db.json`. No build step. |
| `data/db.json` | All merged data. Written by the sync job; do not edit by hand. |
| `data/config.json` | Display names, handles, colors (blue, orange, aqua) and the Shorts length rule. |
| `data/studio/a`, `data/studio/b` | Drop YouTube Studio CSV exports here. |
| `scripts/fetch.js` | Pulls public stats from the YouTube Data API. `YOUTUBE_API_KEY=... node scripts/fetch.js --out out/youtube.json` |
| `scripts/build.js` | Merges a fetch, the Studio CSVs and the config into `data/db.json`. |
| `scripts/channels.json` | The two handles the fetch uses. |
| `update-guide.html`, `UPDATE-GUIDE.md` | The short guide for both channel owners. |

## Notes

- Shorts are detected by length (up to 180 seconds by default, in `data/config.json`). A single video can be overridden from its details panel; that override is stored in the browser, not shared.
- "Why it did what it did" compares each video against the median of comparable uploads on the same channel: same format when there are at least three of them, otherwise the whole channel.
- The dashboard shows clearly labelled sample data until `data/db.json` exists.
- The repository is public so GitHub Pages can serve it for free. It contains only public YouTube statistics and Studio exports; the API key lives in a repository secret and is never committed.
- The earlier Claude artifact version of the dashboard is superseded by this one.

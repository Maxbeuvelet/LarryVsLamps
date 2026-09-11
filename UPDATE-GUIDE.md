# Keeping the dashboard up to date

Dashboard: https://claude.ai/code/artifact/87305d9a-7741-40d4-a090-38a789292d69

## Quick refresh (every day or two, 2 minutes)

Updates both channels at once.

1. Double-click `youtube-sync.html` in the LarryVsLamps folder. Key and handles are remembered.
2. Click **Fetch both channels** and wait for "Done".
3. Click **Copy to clipboard**.
4. Open the dashboard and click **Import data** (top right).
5. Paste into the "Or paste JSON" box, check Larry maps to Channel A and Lamps to Channel B, click **Import**.

Each import adds one point to the growth lines. Skipping days just leaves a gap.

## Studio metrics (weekly, 5 minutes, each channel owner)

Click-through rate and retention are private, so each of you exports your own channel.

1. Go to studio.youtube.com → **Analytics**.
2. Click **Advanced mode** (top right).
3. Open the **Content** tab.
4. With **+ metric**, add: Impressions, Impressions click-through rate, Average view duration, Average percentage viewed. (First time only.)
5. Set the date range to **Lifetime**.
6. Click the **Export** arrow → **.csv**. Unzip the download to find `Table data.csv`.
7. In the dashboard: **Import data** → **YouTube Studio CSV** tab → choose `Table data.csv` → **Import**. Leave the channel on "Detect from video IDs". Do the quick refresh first if the videos aren't in the dashboard yet.

If you'd rather not import it yourself, send the CSV to whoever runs the dashboard.

## What updates when

- **Quick refresh:** subscribers, total views, every video's views/likes/comments, new uploads, growth lines, top videos, verdicts, Shorts vs long-form.
- **Studio CSV:** impressions, CTR, average view duration and percentage viewed. Fills in the "Packaging vs content" chart and the CTR/retention signals in each video's "why" panel.

The Studio import never overwrites view counts; the quick refresh never touches Studio numbers.

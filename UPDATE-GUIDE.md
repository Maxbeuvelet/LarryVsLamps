# Keeping the dashboard up to date

Dashboard: https://maxbeuvelet.github.io/LarryVsLamps/

## Views, subscribers, likes, comments: automatic

Nothing to do. A scheduled job refreshes both channels every morning at 6:00 AM New York time and adds a point to the growth lines. To refresh right now: github.com/Maxbeuvelet/LarryVsLamps → Actions → "Sync YouTube data" → Run workflow.

## Studio metrics (weekly, 5 minutes, each channel owner)

Click-through rate and retention are private, so each of you exports your own channel.

1. Go to studio.youtube.com → **Analytics**.
2. Click **Advanced mode** (top right).
3. Open the **Content** tab.
4. With **+ metric**, add: Impressions, Impressions click-through rate, Average view duration, Average percentage viewed. (First time only.)
5. Set the date range to **Lifetime**.
6. Click the **Export** arrow → **.csv**. Unzip the download to find `Table data.csv`.
7. On the dashboard, click **Upload Studio CSV**, pick your channel and the file.

The numbers show on your screen straight away, and the shared dashboard rebuilds within a few minutes.

First time only: the upload dialog asks for a GitHub token so it can save the file to the repository (the dialog explains how to create one; about two minutes). Your browser remembers it. A friend uploading their own channel must first be added as a collaborator on the repository (Settings → Collaborators), then create their own token.

If you'd rather not, you can still drop the CSV into `data/studio/a` or `data/studio/b` on github.com via Add file → Upload files.

## What updates when

- **Daily job:** subscribers, total views, every video's views/likes/comments, new uploads, growth lines, top videos, verdicts, Shorts vs long-form.
- **Studio CSV:** impressions, CTR, average view duration and percentage viewed. Fills in the "Packaging vs content" chart and the CTR/retention signals in each video's "why" panel.

Studio CSVs never overwrite view counts; the daily job never touches Studio numbers.

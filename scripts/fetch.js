#!/usr/bin/env node
// Fetches public stats for one or more YouTube channels and writes the same JSON
// that youtube-sync.html produces. No dependencies; needs Node 18+.
//
//   YOUTUBE_API_KEY=AIza... node scripts/fetch.js @larry @lamps --out out/youtube.json
//
// Handles can also come from scripts/channels.json: {"a":"@larry","b":"@lamps"}.

const fs = require('fs');
const path = require('path');

const API = 'https://www.googleapis.com/youtube/v3/';
const key = process.env.YOUTUBE_API_KEY;
if (!key) { console.error('Set YOUTUBE_API_KEY.'); process.exit(1); }

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args[outIdx + 1] : 'out/youtube.json';
const noThumbs = args.includes('--no-thumbs');
let handles = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
if (!handles.length) {
  const cfgPath = path.join(__dirname, 'channels.json');
  if (fs.existsSync(cfgPath)) { const c = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); handles = ['a', 'b'].map(k => c[k]).filter(Boolean); }
}
if (!handles.length) { console.error('Give channel handles as arguments or in scripts/channels.json.'); process.exit(1); }

async function api(p, params) {
  const u = new URL(API + p); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v)); u.searchParams.set('key', key);
  const r = await fetch(u); const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status));
  return j;
}
function parseHandle(s) {
  s = s.trim();
  const m = s.match(/youtube\.com\/(?:@([^\/?#]+)|channel\/(UC[\w-]+)|c\/([^\/?#]+)|user\/([^\/?#]+))/i);
  if (m) return m[1] ? { forHandle: '@' + m[1] } : m[2] ? { id: m[2] } : m[3] ? { forHandle: '@' + m[3] } : { forUsername: m[4] };
  if (/^UC[\w-]{20,}$/.test(s)) return { id: s };
  return { forHandle: s.startsWith('@') ? s : '@' + s };
}
const isoDur = d => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || ''); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null; };
async function toDataUrl(url) {
  if (!url || noThumbs) return null;
  try { const r = await fetch(url); if (!r.ok) return null; const b = Buffer.from(await r.arrayBuffer()); if (b.length > 40000) return null; return 'data:' + (r.headers.get('content-type') || 'image/jpeg') + ';base64,' + b.toString('base64'); } catch (e) { return null; }
}
async function fetchChannel(input) {
  const c = await api('channels', Object.assign({ part: 'snippet,statistics,contentDetails', maxResults: 1 }, parseHandle(input)));
  const ch = c.items && c.items[0]; if (!ch) throw new Error('Channel not found: ' + input);
  const uploads = ch.contentDetails.relatedPlaylists.uploads;
  const ids = []; let pageToken = '';
  do { const p = await api('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: 50, pageToken }); (p.items || []).forEach(i => ids.push(i.contentDetails.videoId)); pageToken = p.nextPageToken || ''; } while (pageToken && ids.length < 2000);
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const v = await api('videos', { part: 'snippet,statistics,contentDetails', id: ids.slice(i, i + 50).join(','), maxResults: 50 });
    for (const it of v.items || []) {
      const t = it.snippet.thumbnails || {};
      videos.push({ id: it.id, title: it.snippet.title, publishedAt: it.snippet.publishedAt, durationSec: isoDur(it.contentDetails.duration),
        views: +it.statistics.viewCount || 0, likes: +it.statistics.likeCount || 0, comments: +it.statistics.commentCount || 0,
        thumb: await toDataUrl((t.default && t.default.url) || null) });
    }
  }
  console.error(`${ch.snippet.title}: ${ch.statistics.subscriberCount} subs, ${videos.length} videos`);
  return { id: ch.id, handle: (ch.snippet.customUrl || '').replace(/^@/, '') || null, title: ch.snippet.title,
    thumb: await toDataUrl(ch.snippet.thumbnails && ch.snippet.thumbnails.default && ch.snippet.thumbnails.default.url),
    subs: +ch.statistics.subscriberCount || 0, views: +ch.statistics.viewCount || 0, videoCount: +ch.statistics.videoCount || 0, videos };
}
(async () => {
  const channels = [];
  for (const h of handles) channels.push(await fetchChannel(h));
  const out = { version: 1, fetchedAt: new Date().toISOString(), channels };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.error('Wrote ' + outFile);
})().catch(e => { console.error('Error: ' + e.message); process.exit(1); });

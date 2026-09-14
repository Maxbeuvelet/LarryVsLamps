#!/usr/bin/env node
// Builds data/db.json, the single file the dashboard reads.
//
//   node scripts/build.js [--fetch out/youtube.json] [--studio data/studio] [--config data/config.json] [--db data/db.json]
//
// - Merges a fresh fetch (from scripts/fetch.js) into the existing db.json: today's numbers
//   replace the video and channel stats and one history point per day is appended.
//   Studio metrics and format overrides already in db.json are preserved.
// - Applies YouTube Studio CSV exports found in data/studio/a/*.csv and data/studio/b/*.csv
//   (a = channel A, b = channel B). Rows are matched to videos by video ID. Later files
//   (by name) override earlier ones.
// - Applies data/config.json (names, handles, colors, Shorts length rule).

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const fetchFile = opt('fetch', 'out/youtube.json');
const studioDir = opt('studio', 'data/studio');
const configFile = opt('config', 'data/config.json');
const dbFile = opt('db', 'data/db.json');

const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } };
const isoDay = d => { const x = new Date(d); return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0'); };
const norm = h => String(h || '').trim().replace(/^@/, '').toLowerCase();

const DEFAULT_CONFIG = { channels: { a: { name: 'Channel A', handle: '', color: 'blue' }, b: { name: 'Channel B', handle: '', color: 'orange' } }, shortMax: 180 };
const db = readJson(dbFile) || { config: null, channels: {}, videos: {} };
db.channels = db.channels || {}; db.videos = db.videos || {};
const userConfig = readJson(configFile) || {};
const config = { channels: {}, shortMax: userConfig.shortMax || (db.config && db.config.shortMax) || DEFAULT_CONFIG.shortMax };
for (const k of ['a', 'b']) config.channels[k] = Object.assign({}, DEFAULT_CONFIG.channels[k], (db.config && db.config.channels && db.config.channels[k]) || {}, (userConfig.channels && userConfig.channels[k]) || {});

// ---- 1. merge a fresh fetch ----
const fetched = readJson(fetchFile);
if (fetched && Array.isArray(fetched.channels)) {
  const today = isoDay(fetched.fetchedAt || new Date());
  const used = new Set();
  const slotFor = c => {
    for (const k of ['a', 'b']) { const cc = config.channels[k]; if (!used.has(k) && ((cc.ytId && cc.ytId === c.id) || (cc.handle && norm(cc.handle) === norm(c.handle)))) return k; }
    for (const k of ['a', 'b']) if (!used.has(k) && !config.channels[k].handle && !config.channels[k].ytId) return k;
    for (const k of ['a', 'b']) if (!used.has(k)) return k;
    return null;
  };
  for (const c of fetched.channels) {
    const k = slotFor(c); if (!k) { console.error('No slot for ' + (c.title || c.handle)); continue; } used.add(k);
    const prev = db.channels[k] || {};
    const history = (prev.history || []).filter(h => h.d !== today); history.push({ d: today, subs: c.subs || 0, views: c.views || 0 }); history.sort((x, y) => (x.d < y.d ? -1 : 1));
    db.channels[k] = { subs: c.subs ?? null, views: c.views ?? null, videoCount: c.videoCount ?? (c.videos || []).length, thumb: c.thumb || prev.thumb || null, title: c.title || prev.title || null, fetchedAt: fetched.fetchedAt || new Date().toISOString(), history };
    const cc = config.channels[k];
    if (!cc.ytId && c.id) cc.ytId = c.id;
    if (!cc.handle && c.handle) cc.handle = '@' + norm(c.handle);
    if ((!cc.name || cc.name === DEFAULT_CONFIG.channels[k].name) && c.title) cc.name = c.title;
    for (const x of c.videos || []) {
      const pv = db.videos[x.id] || {};
      const hist = (pv.history || []).filter(h => h.d !== today); hist.push({ d: today, views: x.views || 0, likes: x.likes || 0, comments: x.comments || 0 }); if (hist.length > 400) hist.splice(0, hist.length - 400);
      db.videos[x.id] = Object.assign({}, pv, { id: x.id, ch: k, title: x.title || pv.title || x.id, publishedAt: x.publishedAt || pv.publishedAt, durationSec: x.durationSec ?? pv.durationSec ?? null, views: x.views || 0, likes: x.likes || 0, comments: x.comments || 0, thumb: x.thumb || pv.thumb || null, history: hist });
    }
    console.error(`${c.title || c.handle} -> channel ${k}: ${(c.videos || []).length} videos, ${history.length} history point(s)`);
  }
} else console.error('No fetch file at ' + fetchFile + '; keeping existing stats.');

// ---- 1b. benchmark channels (other creators, newest uploads only; replaced wholesale each fetch) ----
const benchList = (readJson(opt('benchmarks', 'data/benchmarks.json')) || {}).channels || [];
db.benchmarkHandles = benchList;
if (fetched && Array.isArray(fetched.benchmarks)) {
  db.benchmarks = {};
  for (const b of fetched.benchmarks) {
    if (!b || b.error || !b.id) { if (b && b.error) console.error('Benchmark ' + b.requestedHandle + ': ' + b.error); continue; }
    db.benchmarks[b.id] = { id: b.id, handle: b.handle ? '@' + norm(b.handle) : b.requestedHandle, requestedHandle: b.requestedHandle, title: b.title, thumb: b.thumb || null, subs: b.subs, views: b.views, videoCount: b.videoCount, fetchedAt: fetched.fetchedAt,
      videos: (b.videos || []).map(v => ({ id: v.id, title: v.title, publishedAt: v.publishedAt, durationSec: v.durationSec, views: v.views, likes: v.likes, comments: v.comments })) };
  }
  console.error('Benchmarks: ' + Object.keys(db.benchmarks).length + ' channel(s)');
} else db.benchmarks = db.benchmarks || {};

// ---- 2. apply Studio CSV exports ----
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
const num = s => { if (s == null) return null; const n = parseFloat(String(s).replace(/[,%\s]/g, '')); return isNaN(n) ? null : n; };
const dur = s => { if (s == null || s === '') return null; s = String(s).trim(); if (s.includes(':')) return s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0); const n = parseFloat(s.replace(/,/g, '')); return isNaN(n) ? null : n; };
let studioApplied = 0;
for (const k of ['a', 'b']) {
  const dir = path.join(studioDir, k); let files = []; try { files = fs.readdirSync(dir).filter(f => /\.csv$/i.test(f)).sort(); } catch (e) { continue; }
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '');
    const rows = parseCSV(text); if (rows.length < 2) continue;
    const head = rows[0].map(h => h.trim().toLowerCase()); const find = re => head.findIndex(h => re.test(h));
    const col = { id: find(/^content$|video id|^video$/), title: find(/video title|^title$/), views: find(/^views$/), impressions: find(/^impressions$/), ctr: find(/click-?through/), avd: find(/average view duration/), avp: find(/average percentage viewed|average % viewed/), watch: find(/watch time/), subs: find(/^subscribers$/), pub: find(/publish/) };
    if (col.id < 0) { console.error(`${f}: no Content / video ID column, skipped`); continue; }
    let n = 0;
    for (const r of rows.slice(1)) {
      const id = (r[col.id] || '').trim(); if (!id || /^total$/i.test(id) || !/^[\w-]{6,}$/.test(id)) continue;
      let v = db.videos[id];
      if (!v) { const title = col.title >= 0 ? r[col.title] : ''; if (!title) continue; v = db.videos[id] = { id, ch: k, title, publishedAt: col.pub >= 0 && r[col.pub] ? new Date(r[col.pub]).toISOString() : new Date().toISOString(), durationSec: null, views: col.views >= 0 ? num(r[col.views]) || 0 : 0, likes: 0, comments: 0, thumb: null, history: [] }; }
      const s = { impressions: col.impressions >= 0 ? num(r[col.impressions]) : null, ctr: col.ctr >= 0 ? num(r[col.ctr]) : null, avd: col.avd >= 0 ? dur(r[col.avd]) : null, avp: col.avp >= 0 ? num(r[col.avp]) : null, watchHours: col.watch >= 0 ? num(r[col.watch]) : null, subsGained: col.subs >= 0 ? num(r[col.subs]) : null, source: f };
      if (v.durationSec == null && s.avd != null && s.avp) v.durationSec = Math.round(s.avd / (s.avp / 100));
      if (s.avp == null && s.avd != null && v.durationSec) s.avp = +(s.avd / v.durationSec * 100).toFixed(1);
      v.studio = Object.assign({}, v.studio || {}, s); n++;
    }
    console.error(`${k}/${f}: ${n} rows applied`); studioApplied += n;
  }
}

// ---- 3. write ----
db.config = config; db.updatedAt = fetched ? (fetched.fetchedAt || new Date().toISOString()) : (db.updatedAt || null);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
fs.writeFileSync(dbFile, JSON.stringify(db));
console.error(`Wrote ${dbFile}: ${Object.keys(db.videos).length} videos, ${Object.keys(db.channels).length} channels, ${studioApplied} Studio rows`);

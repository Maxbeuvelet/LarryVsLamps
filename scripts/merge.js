#!/usr/bin/env node
// Merges a fresh fetch (out/youtube.json) into the dashboard's existing documents,
// using the same rules as the dashboard's own Import button, and writes the
// documents to send back plus a manifest of write batches.
//
//   node scripts/merge.js out/youtube.json out/db out/docs
//
//   out/db   - existing documents saved by the Artifact tool's read_db with out_dir:
//              out/db/channels/a.json, out/db/videos/<id>.json, out/db/meta/config.json
//   out/docs - where merged documents are written, mirroring that layout
//   out/docs/manifest.json - batches of {op, collection, doc_id, file_path}, max 50 each

const fs = require('fs');
const path = require('path');

const [fetchFile = 'out/youtube.json', dbDir = 'out/db', outDir = 'out/docs'] = process.argv.slice(2);
const fetched = JSON.parse(fs.readFileSync(fetchFile, 'utf8'));
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } };
const listDir = d => { try { return fs.readdirSync(d).filter(f => f.endsWith('.json')); } catch (e) { return []; } };
const isoDay = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const norm = h => String(h || '').trim().replace(/^@/, '').toLowerCase();

const DEFAULT_CONFIG = { channels: { a: { name: 'Larry', handle: '', color: 'blue' }, b: { name: 'Lamps', handle: '', color: 'orange' } }, shortMax: 180 };
const config = Object.assign({}, DEFAULT_CONFIG, readJson(path.join(dbDir, 'meta', 'config.json')) || {});
config.channels = Object.assign({}, DEFAULT_CONFIG.channels, config.channels || {});
const existingChannels = {}; for (const f of listDir(path.join(dbDir, 'channels'))) existingChannels[f.replace(/\.json$/, '')] = readJson(path.join(dbDir, 'channels', f));
const existingVideos = {}; for (const f of listDir(path.join(dbDir, 'videos'))) existingVideos[f.replace(/\.json$/, '')] = readJson(path.join(dbDir, 'videos', f));
const sampleMode = Object.keys(existingVideos).some(id => id.startsWith('smp_'));
if (sampleMode) { console.error('Existing store holds sample data; ignoring it.'); for (const k in existingVideos) delete existingVideos[k]; for (const k in existingChannels) delete existingChannels[k]; }

// Map incoming channels to slots a/b: by stored channel id, then handle, then channels.json order, then first free slot.
const orderCfg = readJson(path.join(__dirname, 'channels.json')) || {};
const used = new Set();
const slotFor = c => {
  for (const k of ['a', 'b']) { const cc = config.channels[k] || {}; if (!used.has(k) && ((cc.ytId && cc.ytId === c.id) || (cc.handle && norm(cc.handle) === norm(c.handle)))) return k; }
  for (const k of ['a', 'b']) if (!used.has(k) && orderCfg[k] && norm(orderCfg[k]) === norm(c.handle)) return k;
  for (const k of ['a', 'b']) if (!used.has(k) && !(config.channels[k] || {}).handle && !(config.channels[k] || {}).ytId) return k;
  for (const k of ['a', 'b']) if (!used.has(k)) return k;
  return null;
};

const today = isoDay(new Date());
const writes = [];
const emit = (collection, doc_id, data) => { const p = path.join(outDir, collection, doc_id + '.json'); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(data)); writes.push({ op: 'set', collection, doc_id, file_path: p.replace(/\\/g, '/') }); };

let nv = 0; let configChanged = false;
for (const c of fetched.channels || []) {
  const k = slotFor(c); if (!k) { console.error('No free slot for ' + (c.title || c.handle)); continue; } used.add(k);
  const prev = existingChannels[k] || {};
  const history = (prev.history || []).filter(h => h.d !== today); history.push({ d: today, subs: c.subs || 0, views: c.views || 0 }); history.sort((x, y) => (x.d < y.d ? -1 : 1));
  emit('channels', k, { subs: c.subs ?? null, views: c.views ?? null, videoCount: c.videoCount ?? (c.videos || []).length, thumb: c.thumb || prev.thumb || null, title: c.title || null, fetchedAt: fetched.fetchedAt || new Date().toISOString(), history });
  const cc = config.channels[k];
  const next = Object.assign({}, cc, { handle: cc.handle || c.handle || '', ytId: c.id || cc.ytId || '', name: cc.name && cc.name !== DEFAULT_CONFIG.channels[k].name ? cc.name : (c.title || cc.name) });
  if (JSON.stringify(next) !== JSON.stringify(cc)) { config.channels[k] = next; configChanged = true; }
  for (const x of c.videos || []) {
    const pv = existingVideos[x.id] || {};
    const hist = (pv.history || []).filter(h => h.d !== today); hist.push({ d: today, views: x.views || 0, likes: x.likes || 0, comments: x.comments || 0 }); if (hist.length > 400) hist.splice(0, hist.length - 400);
    emit('videos', x.id, Object.assign({}, pv, { id: x.id, ch: k, title: x.title || pv.title || x.id, publishedAt: x.publishedAt || pv.publishedAt, durationSec: x.durationSec ?? pv.durationSec ?? null, views: x.views || 0, likes: x.likes || 0, comments: x.comments || 0, thumb: x.thumb || pv.thumb || null, history: hist }));
    nv++;
  }
  console.error(`${c.title || c.handle} -> channel ${k}: ${(c.videos || []).length} videos, history now ${history.length} points`);
}
if (configChanged) emit('meta', 'config', config);

const batches = []; for (let i = 0; i < writes.length; i += 50) batches.push(writes.slice(i, i + 50));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totalWrites: writes.length, batches }, null, 2));
console.error(`${writes.length} documents to write in ${batches.length} batch(es); manifest at ${path.join(outDir, 'manifest.json')}`);

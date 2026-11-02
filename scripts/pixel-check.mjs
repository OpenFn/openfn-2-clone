// A local, Chromatic-style visual check: screenshot every story in two built
// Storybooks and list only the ones whose pixels differ, so a change that
// should look the same is reviewed by what actually changed on screen.
//
//   npx storybook build -o <dir>   (once per commit)
//   node scripts/pixel-check.mjs <before-dir> <after-dir> <out-dir>
//
// Writes <out-dir>/index.html: one row per changed, added or removed story.
// Click a row to step through them full size: ← → move between stories,
// 1–4 switch diff / close-up / before / after, F flags one, Esc closes.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const [beforeDir, afterDir, outDir] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: pixel-check.mjs <before-dir> <after-dir> <out-dir>');
  process.exit(1);
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
function serve(dir) {
  const server = createServer(async (req, res) => {
    const root = resolve(dir);
    const path = resolve(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    // Only files inside the Storybook build.
    if (path !== root && !path.startsWith(root + sep)) return res.writeHead(404).end();
    try {
      const body = await readFile(path.endsWith('/') ? join(path, 'index.html') : path);
      res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const storyIds = async (dir) =>
  Object.values(JSON.parse(await readFile(join(dir, 'index.json'), 'utf8')).entries)
    .filter((e) => e.type === 'story')
    .map((e) => e.id);

async function shoot(browser, port, id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  try {
    // Stories that show "3 minutes ago" would differ run to run otherwise.
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
    await page.goto(`http://localhost:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await page.evaluate(() => document.fonts.ready);
    return await page.screenshot({ fullPage: true });
  } finally {
    await page.close();
  }
}

// Changed-pixel count and a red-on-faded diff image. Where one screenshot is
// taller or wider, the part only one of them covers counts as changed.
function diff(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  const w = Math.max(A.width, B.width), h = Math.max(A.height, B.height);
  const out = new PNG({ width: w, height: h });
  let changed = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    const inA = x < A.width && y < A.height, inB = x < B.width && y < B.height;
    const ia = (y * A.width + x) * 4, ib = (y * B.width + x) * 4;
    const same = inA && inB && A.data[ia] === B.data[ib] && A.data[ia + 1] === B.data[ib + 1] && A.data[ia + 2] === B.data[ib + 2];
    if (same) {
      const g = 255 - (255 - A.data[ia]) / 4;
      out.data.set([g, g, g, 255], o);
    } else {
      changed++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      out.data.set([230, 0, 0, 255], o);
    }
  }
  return { changed, image: PNG.sync.write(out), crop: changed && crop(A, B, x0, y0, x1, y1) };
}

// Before and after side by side, cut to the changed area plus a margin, so a
// one-line change isn't lost in a full-page screenshot.
function crop(A, B, x0, y0, x1, y1) {
  const m = 30;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
  const w = Math.min(Math.max(A.width, B.width), x1 + m + 1) - x0;
  const h = Math.min(Math.max(A.height, B.height), y1 + m + 1, y0 + 900) - y0;
  const out = new PNG({ width: w * 2 + 12, height: h });
  out.data.fill(255);
  for (const [img, ox] of [[A, 0], [B, w + 12]])
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (x0 + x >= img.width || y0 + y >= img.height) continue;
      const src = ((y0 + y) * img.width + x0 + x) * 4;
      img.data.copy(out.data, (y * out.width + ox + x) * 4, src, src + 4);
    }
  return PNG.sync.write(out);
}

const [sa, sb] = await Promise.all([serve(beforeDir), serve(afterDir)]);
const [idsA, idsB] = await Promise.all([storyIds(beforeDir), storyIds(afterDir)]);
const all = [...new Set([...idsA, ...idsB])].sort();
await mkdir(join(outDir, 'img'), { recursive: true });
const browser = await chromium.launch();
const rows = [];
let done = 0;

// ponytail: 4 stories at a time; raise if the machine has room.
const queue = [...all];
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let id; (id = queue.shift()); ) {
    if (++done % 100 === 0) console.log(`${done}/${all.length}`);
    try {
      await compare(id);
    } catch (e) {
      // One story failing to load shouldn't lose the whole run.
      rows.push({ id, status: 'error', changed: 0 });
      console.error(`${id}: ${e.message.split('\n')[0]}`);
    }
  }
}));

async function compare(id) {
  const a = idsA.includes(id) ? await shoot(browser, sa.address().port, id) : null;
  const b = idsB.includes(id) ? await shoot(browser, sb.address().port, id) : null;
  if (a && b && a.equals(b)) return;
  let status = !a ? 'added' : !b ? 'removed' : 'changed', changed = 0;
  // A story that differs from itself (Monaco, random keys) can't be judged.
  if (a && b && !a.equals(await shoot(browser, sa.address().port, id))) status = 'flaky';
  if (a && b) {
    const d = diff(a, b);
    changed = d.changed;
    if (!changed) return; // encoder noise, same pixels
    await writeFile(join(outDir, 'img', `${id}.diff.png`), d.image);
    await writeFile(join(outDir, 'img', `${id}.crop.png`), d.crop);
  }
  if (a) await writeFile(join(outDir, 'img', `${id}.before.png`), a);
  if (b) await writeFile(join(outDir, 'img', `${id}.after.png`), b);
  rows.push({ id, status, changed });
}
await browser.close();
sa.close();
sb.close();

await writeReport(outDir, rows, all.length);
console.log(`${rows.length} of ${all.length} stories differ: ${join(outDir, 'index.html')}`);

async function writeReport(dir, rows, total) {
  // Under this many changed pixels it's almost always an edge drawn half a
  // pixel differently (a toggle's curve, an underline), not something you'd see.
  const MINOR = 50;
  for (const r of rows) if (r.status === 'changed' && r.changed < MINOR) r.status = 'minor';
  const order = { changed: 0, added: 1, removed: 2, minor: 3, flaky: 4, error: 5 };
  rows.sort((x, y) => order[x.status] - order[y.status] || x.changed - y.changed);
  const firstMinor = rows.findIndex((r) => r.status === 'minor');
  await writeFile(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Pixel check</title>
<style>
body{font:14px system-ui;margin:24px;color:#111}
tr.row{cursor:pointer}tr.row:hover{background:#f3f4f6}tr.flagged td:first-child{box-shadow:inset 4px 0 #dc2626}
td{vertical-align:top;padding:8px;border-top:1px solid #ddd}td img{max-width:640px;border:1px solid #ccc}
#v{position:fixed;inset:0;background:#fff;display:none;flex-direction:column}#v.open{display:flex}
#bar{display:flex;gap:12px;align-items:center;padding:10px 16px;border-bottom:1px solid #ddd}
#bar button{font:inherit;padding:4px 10px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer}
#bar button.on{background:#111;color:#fff;border-color:#111}#bar button.flag.on{background:#dc2626;border-color:#dc2626}
#bar .id{font-weight:600}#bar .grow{flex:1}#pic{flex:1;overflow:auto;padding:16px;background:#f3f4f6}#pic img{max-width:100%}
#flags{white-space:pre;background:#f3f4f6;padding:8px}
</style>
<h1>Pixel check</h1>
<p>${total} stories; ${rows.length} differ. Changed ones run smallest change first. Minor ones (under 50 px, almost always invisible edge shading) come after, then flaky ones that differ from themselves, and error ones that didn't load.</p>
<p>Click a row to step through full size: <b>← →</b> next story, <b>1–4</b> diff / close-up / before / after, <b>F</b> flag it, <b>Esc</b> back to the list.</p>
<details><summary>Flagged stories (<span id=n>0</span>)</summary><div id=flags></div></details>
<table><tr><th>Story</th><th>Close-up (before | after)</th></tr>
${rows.map((r, i) => `${i === firstMinor ? '<tr><th colspan=2 style="text-align:left;padding-top:24px">Minor: probably invisible (under 50 px)</th></tr>' : ''}<tr class=row data-i=${i}><td><b>${r.id}</b><br>${r.status}${r.changed ? `<br>${r.changed} px` : ''}</td><td>${r.changed ? `<img src="img/${r.id}.crop.png" loading=lazy>` : r.status === 'error' ? '' : r.status === 'removed' ? `<img src="img/${r.id}.before.png" loading=lazy>` : `<img src="img/${r.id}.after.png" loading=lazy>`}</td></tr>`).join('\n')}
</table>
<div id=v><div id=bar><button id=prev>←</button><span id=pos></span><button id=next>→</button><span class=id id=title></span><span id=meta></span><span class=grow></span>
<button data-k=diff>1 Diff</button><button data-k=crop>2 Close-up</button><button data-k=before>3 Before</button><button data-k=after>4 After</button>
<button class=flag id=flag>F Flag</button><button id=close>Esc</button></div><div id=pic><img id=img></div></div>
<script>
const rows = ${JSON.stringify(rows)};
const flags = new Set(JSON.parse(localStorage.getItem('pixel-flags:' + location.pathname) || '[]'));
let i = 0, view = 'diff';
const has = (r, k) => r.status === 'error' ? false : k === 'before' ? r.status !== 'added' : k === 'after' ? r.status !== 'removed' : r.changed > 0;
function show() {
  const r = rows[i];
  if (!has(r, view)) view = ['diff', 'crop', 'after', 'before'].find((k) => has(r, k));
  img.hidden = !view;
  if (view) img.src = 'img/' + r.id + '.' + view + '.png';
  title.textContent = r.id;
  meta.textContent = r.status + (r.changed ? ' · ' + r.changed + ' px' : '');
  pos.textContent = (i + 1) + ' / ' + rows.length;
  document.querySelectorAll('[data-k]').forEach((b) => { b.classList.toggle('on', b.dataset.k === view); b.disabled = !has(r, b.dataset.k); });
  flag.classList.toggle('on', flags.has(r.id));
  pic.scrollTop = 0;
}
function save() {
  localStorage.setItem('pixel-flags:' + location.pathname, JSON.stringify([...flags]));
  n.textContent = flags.size;
  document.getElementById('flags').textContent = [...flags].join('\\n');
  document.querySelectorAll('tr.row').forEach((t) => t.classList.toggle('flagged', flags.has(rows[t.dataset.i].id)));
}
const open = (j) => { i = j; view = 'diff'; v.classList.add('open'); show(); };
const go = (d) => { i = (i + d + rows.length) % rows.length; view = 'diff'; show(); };
const toggleFlag = () => { const id = rows[i].id; flags.has(id) ? flags.delete(id) : flags.add(id); save(); show(); };
document.querySelectorAll('tr.row').forEach((t) => t.onclick = () => open(+t.dataset.i));
prev.onclick = () => go(-1); next.onclick = () => go(1); document.getElementById('close').onclick = () => v.classList.remove('open'); flag.onclick = toggleFlag;
document.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { view = b.dataset.k; show(); });
addEventListener('keydown', (e) => {
  if (!v.classList.contains('open')) return;
  const k = { ArrowLeft: () => go(-1), ArrowRight: () => go(1), Escape: () => v.classList.remove('open'), f: toggleFlag, F: toggleFlag,
    1: () => { view = 'diff'; show(); }, 2: () => { view = 'crop'; show(); }, 3: () => { view = 'before'; show(); }, 4: () => { view = 'after'; show(); } }[e.key];
  if (k) { e.preventDefault(); k(); }
});
save();
</script>`);
}

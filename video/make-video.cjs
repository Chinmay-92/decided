#!/usr/bin/env node
// Renders video/decided_demo.mp4: synthetic narration (macOS `say`) + Playwright screen recording,
// with each beat's on-screen action starting exactly when its narration line starts.
//
// Prereqs: the app running on http://localhost:3000 in demo mode with a fresh seeded log
//   (rm data/decisions.json && npm start), ffmpeg/ffprobe, and playwright@1.64.1 resolvable
//   (it is NOT a project dependency; e.g. NODE_PATH=/path/to/node_modules node video/make-video.cjs).
// Flags: --keep-audio  reuse existing video/seg-*.aiff (e.g. your own re-recorded voice)
//        --skip-record reuse video/screen.webm + video/schedule.json and only re-mux
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const DIR = __dirname;
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg';
const FFPROBE = process.env.FFPROBE || '/opt/homebrew/bin/ffprobe';
const APP = process.env.APP_URL || 'http://localhost:3000';
const VOICE = process.env.VOICE || 'Daniel';
const W = 1280, H = 800;
const GAP = 0.55; // silence after each line
const LEAD = 0.6; // silence before the first line
const args = new Set(process.argv.slice(2));

// Extra seconds of footage after a beat's line, so on-screen actions have room to land.
const HOLD = {
  'hook.1': 0.6, 'hook.2': 1.4, 'hook.3': 1.8,
  'problem.1': 3.6, 'problem.2': 1.2, 'problem.3': 2.2,
  'core.1': 2.6, 'core.2': 1.0, 'core.3': 3.4, 'core.4': 1.2, 'core.5': 1.6, 'core.6': 2.0,
  'kernel.1': 1.4, 'kernel.2': 1.6, 'kernel.3': 1.4, 'kernel.4': 2.0,
  'export.1': 4.0, 'export.2': 3.4, 'export.3': 2.6, 'export.4': 2.2,
  'built.1': 2.4, 'built.2': 2.4, 'built.3': 1.2, 'built.4': 3.2,
};

const probe = (f) => Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

function readBeats() {
  const md = fs.readFileSync(path.join(DIR, 'narration.md'), 'utf8');
  const block = md.split('<!-- SEGMENTS:BEGIN -->')[1].split('<!-- SEGMENTS:END -->')[0];
  return block.split('\n').filter((l) => l.includes(' | ')).map((l) => {
    const [id, ...rest] = l.split(' | ');
    return { id: id.trim(), text: rest.join(' | ').trim(), audio: path.join(DIR, `seg-${id.trim()}.aiff`) };
  });
}

function buildSchedule(beats) {
  let t = LEAD;
  for (const b of beats) {
    if (!args.has('--keep-audio') || !fs.existsSync(b.audio)) {
      const spoken = b.text.replace(/([.?:,]) /g, '$1 [[slnc 250]] ');
      execFileSync('say', ['-v', VOICE, '-r', '165', '-o', b.audio, spoken]);
    }
    b.dur = probe(b.audio);
    b.start = t;
    b.len = b.dur + GAP + (HOLD[b.id] ?? 1);
    t += b.len;
  }
  return t;
}

// ---------------- recording ----------------
const INIT = `
(() => {
  const css = \`
    #__cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; pointer-events: none; z-index: 2147483647;
      transform: translate(-100px,-100px); margin: 0; padding: 0; border: 0; background: none; overflow: visible; inset: auto; }
    #__cursor svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.4)); }
    #__cursor.down svg { transform: scale(.85); transform-origin: 0 0; }
    .__hl { outline: 3px solid #f0a020 !important; outline-offset: 3px; border-radius: 8px; transition: outline-color .3s; }
    #__note { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); background: #1d2430; color: #fff;
      padding: 10px 18px; border-radius: 10px; font: 600 16px -apple-system, sans-serif; margin: 0; border: 0; inset: auto auto 28px 50%; }
  \`;
  const add = () => {
    if (document.getElementById('__cursor')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.append(st);
    const c = document.createElement('div'); c.id = '__cursor'; c.setAttribute('popover', 'manual');
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M2 1 L2 18 L6.5 13.8 L9.6 20.5 L12.4 19.2 L9.4 12.7 L15.5 12.4 Z" fill="#111" stroke="#fff" stroke-width="1.4"/></svg>';
    document.body.append(c); c.showPopover();
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
    addEventListener('mousedown', () => c.classList.add('down'), true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', add); else add();
  window.__raiseCursor = () => { const c = document.getElementById('__cursor'); if (c) { c.hidePopover(); c.showPopover(); } };
})();
`;

async function record(beats, total) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'light',
    recordVideo: { dir: path.join(DIR, 'clips'), size: { width: W, height: H } },
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP });
  await context.addInitScript(INIT);
  const tCreate = Date.now();
  const page = await context.newPage();
  const cards = 'file://' + path.join(DIR, 'cards.html');
  await page.goto(cards);
  await page.waitForTimeout(300);
  const t0 = Date.now();

  let mouse = { x: 640, y: 400 };
  const sleep = (ms) => page.waitForTimeout(ms);
  const show = (scene) => page.evaluate((s) => { window.show(s); }, scene);
  const center = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const moveTo = async (sel, steps = 22) => { const p = await center(sel); await page.mouse.move(p.x, p.y, { steps }); mouse = p; };
  const click = async (sel) => { await moveTo(sel); await sleep(150); await page.mouse.down(); await sleep(90); await page.mouse.up(); };
  const hl = (sel) => page.evaluate((s) => document.querySelectorAll(s).forEach((e) => e.classList.add('__hl')), sel);
  const unhl = () => page.evaluate(() => document.querySelectorAll('.__hl').forEach((e) => e.classList.remove('__hl')));
  const scrollToY = async (y) => { await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), y); await sleep(700); };
  const scrollIntoView = async (sel, block = 'center') => { await page.evaluate(([s, b]) => document.querySelector(s).scrollIntoView({ behavior: 'smooth', block: b }), [sel, block]); await sleep(800); };
  const note = (text) => page.evaluate((t) => { let n = document.getElementById('__note'); if (!n) { n = document.createElement('div'); n.id = '__note'; n.setAttribute('popover', 'manual'); document.body.append(n); } n.textContent = t; n.showPopover(); window.__raiseCursor(); }, text);
  const NEW_TITLE = 'Webhook retries: SQS + DLQ, not Kafka';

  const actions = {
    'hook.1': () => show('hook1'),
    'hook.2': () => show('hook2'),
    'hook.3': () => show('hook3'),
    'problem.1': () => show('chat'),
    'problem.2': async () => {},
    'problem.3': () => show('compare'),
    'core.1': () => show('term-start'),
    'core.2': async () => {
      await page.goto(APP); await page.waitForSelector('#mode:not(:empty)'); await page.waitForFunction(() => document.getElementById('example-select').options.length > 1);
      await page.mouse.move(700, 450); await sleep(300);
      await hl('#mode'); await moveTo('#mode', 30);
    },
    'core.3': async () => {
      await unhl();
      await moveTo('#example-select', 25); await sleep(250);
      await page.selectOption('#example-select', { label: 'Webhook retries: Kafka or SQS?' });
      await page.dispatchEvent('#example-select', 'change');
      await sleep(1800);
      await click('#extract');
      await page.waitForSelector('#record:not([hidden])');
    },
    'core.4': async () => { await hl('#f-decision'); await moveTo('#f-decision'); },
    'core.5': async () => {
      await unhl(); await hl('#f-decidedBy'); await moveTo('#f-decidedBy'); await sleep(1300);
      await scrollIntoView('#f-options', 'start'); await hl('#f-options'); await moveTo('#f-options'); await sleep(1000); await hl('#f-rationale');
    },
    'core.6': async () => {
      await unhl(); await scrollIntoView('#f-actions', 'center'); await hl('#f-actions'); await moveTo('#f-actions'); await sleep(1600);
      await hl('#f-openQuestions'); await moveTo('#f-openQuestions');
    },
    'kernel.1': async () => { await unhl(); await scrollToY(0); await hl('#related'); await page.mouse.move(930, 230, { steps: 20 }); },
    'kernel.2': async () => { await moveTo('#related a', 25); },
    'kernel.3': async () => { await unhl(); await hl('#related .score'); await moveTo('#related .score', 20); },
    'kernel.4': async () => { await unhl(); await hl('#related'); await page.mouse.move(1150, 330, { steps: 20 }); },
    'export.1': async () => {
      await unhl();
      await moveTo('#f-title'); await page.mouse.click((await center('#f-title')).x, (await center('#f-title')).y, { clickCount: 3 });
      await page.keyboard.press('Meta+A');
      await page.keyboard.type(NEW_TITLE, { delay: 55 });
      await sleep(300);
      await scrollIntoView('#save', 'center');
      await click('#save');
      await page.waitForFunction(() => document.getElementById('saved-msg').textContent.includes('Saved'));
      await hl('#saved-msg');
    },
    'export.2': async () => {
      await unhl(); await scrollToY(0);
      await click('#tab-log');
      await sleep(900);
      await click('#search');
      await page.keyboard.type('sqs', { delay: 220 });
      await sleep(600);
    },
    'export.3': async () => {
      const item = `#log-list li:has-text("${NEW_TITLE}")`;
      await click(item);
      await page.waitForSelector('#detail[open]'); await page.evaluate(() => window.__raiseCursor());
      await sleep(1300);
      await click('#detail-copy');
      const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
      await note(clip.startsWith('# ') ? 'Copied: ' + clip.split('\n')[0].slice(0, 60) : 'Markdown copied');
    },
    'export.4': async () => {
      await page.evaluate(() => document.getElementById('detail').querySelector('article').scrollTo?.({ top: 0 }));
      await page.mouse.move(1100, 700, { steps: 20 });
    },
    'built.1': async () => { await page.goto(cards); await show('term-key'); },
    'built.2': () => show('repo'),
    'built.3': async () => {},
    'built.4': () => show('end'),
  };

  const until = async (sec) => { const ms = t0 + sec * 1000 - Date.now(); if (ms > 0) await sleep(ms); };
  for (const b of beats) {
    await until(b.start - (b.id === 'core.2' || b.id === 'built.1' ? 0.25 : 0)); // page loads get a head start
    const late = (Date.now() - t0) / 1000 - b.start;
    try { await actions[b.id](); } catch (e) { await page.screenshot({ path: path.join(DIR, 'error.png') }); throw e; }
    const over = (Date.now() - t0) / 1000 - (b.start + b.len);
    console.log(`${b.id.padEnd(10)} start ${b.start.toFixed(2)}s  late ${late.toFixed(2)}s${over > 0 ? `  OVERRAN by ${over.toFixed(2)}s` : ''}`);
  }
  await until(total + 0.3);
  const video = page.video();
  await context.close();
  await browser.close();
  const webm = path.join(DIR, 'screen.webm');
  fs.renameSync(await video.path(), webm);
  return { webm, trim: (t0 - tCreate) / 1000 };
}

function mux(beats, total, webm, trim) {
  const out = path.join(DIR, 'decided_demo.mp4');
  const inputs = ['-ss', trim.toFixed(3), '-i', webm];
  const filters = [];
  beats.forEach((b, i) => {
    inputs.push('-i', b.audio);
    const ms = Math.round(b.start * 1000);
    filters.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=mono,adelay=${ms}:all=1[a${i}]`);
  });
  filters.push(`${beats.map((_, i) => `[a${i}]`).join('')}amix=inputs=${beats.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5[aout]`);
  filters.push(`[0:v]fps=30,tpad=stop_mode=clone:stop_duration=2,trim=0:${total.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[vout]`);
  execFileSync(FFMPEG, ['-y', '-v', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[vout]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out], { stdio: 'inherit' });
  return out;
}

(async () => {
  const beats = readBeats();
  const total = buildSchedule(beats);
  console.log(`${beats.length} beats, narration ${beats.reduce((s, b) => s + b.dur, 0).toFixed(1)}s, total ${total.toFixed(1)}s`);
  let rec;
  const schedFile = path.join(DIR, 'schedule.json');
  if (args.has('--skip-record')) rec = JSON.parse(fs.readFileSync(schedFile, 'utf8')).rec;
  else { rec = await record(beats, total); fs.writeFileSync(schedFile, JSON.stringify({ rec, total, beats }, null, 2)); }
  const out = mux(beats, total, rec.webm, rec.trim);
  console.log(`wrote ${out} (${probe(out).toFixed(2)}s)`);
})().catch((e) => { console.error(e); process.exit(1); });

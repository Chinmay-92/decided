// Decided — local web server. Zero dependencies: run with `npm start`.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractDecision, normaliseRecord } from './src/extract.js';
import { claudeAvailable, extractWithClaude, DEFAULT_MODEL } from './src/claude.js';
import { findRelated } from './src/similar.js';
import { toAdrMarkdown } from './src/adr.js';
import { createStore } from './src/store.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const MAX_BODY = 200_000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
// Static files the browser may load (explicit allow-list: no path traversal possible).
const STATIC = {
  '/': 'public/index.html',
  '/app.js': 'public/app.js',
  '/styles.css': 'public/styles.css',
  '/favicon.svg': 'public/favicon.svg',
  '/lib/adr.js': 'src/adr.js',
  '/samples/examples.json': 'samples/examples.json',
};

export function createApp({ env = process.env, dataFile, fetchImpl } = {}) {
  const store = createStore(dataFile || env.DECIDED_DATA_FILE || join(ROOT, 'data', 'decisions.json'), {
    seedFile: join(ROOT, 'samples', 'seed-decisions.json'),
  });

  const send = (res, status, body, type = 'application/json') => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
    const raw = Buffer.isBuffer(body) || typeof body === 'string';
    res.end(raw ? body : JSON.stringify(body));
  };

  const readJson = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(Object.assign(new Error('Request too large (max 200 KB)'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
        } catch {
          reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
        }
      });
      req.on('error', reject);
    });

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;

    if (req.method === 'GET' && STATIC[path]) {
      const file = STATIC[path];
      return send(res, 200, await readFile(join(ROOT, file)), TYPES[extname(file)] || 'text/plain');
    }

    if (path === '/api/health' && req.method === 'GET') {
      return send(res, 200, { ok: true, mode: claudeAvailable(env) ? 'claude' : 'demo', model: claudeAvailable(env) ? env.ANTHROPIC_MODEL || DEFAULT_MODEL : null });
    }

    if (path === '/api/extract' && req.method === 'POST') {
      const { thread } = await readJson(req);
      if (!thread || !String(thread).trim()) return send(res, 400, { error: 'Paste a thread first.' });
      let record;
      let warning = null;
      if (claudeAvailable(env)) {
        try {
          record = await extractWithClaude(String(thread), { env, fetchImpl });
        } catch (err) {
          warning = `Claude was unavailable (${err.message}). Used demo mode instead.`;
        }
      }
      if (!record) record = extractDecision(String(thread));
      const related = findRelated(record, await store.list());
      return send(res, 200, { record, related, warning });
    }

    if (path === '/api/related' && req.method === 'POST') {
      const record = normaliseRecord(await readJson(req));
      return send(res, 200, { related: findRelated(record, await store.list()) });
    }

    if (path === '/api/adr' && req.method === 'POST') {
      return send(res, 200, toAdrMarkdown(normaliseRecord(await readJson(req))), 'text/markdown; charset=utf-8');
    }

    if (path === '/api/decisions' && req.method === 'GET') {
      return send(res, 200, { decisions: await store.list(url.searchParams.get('q') || '') });
    }

    if (path === '/api/decisions' && req.method === 'POST') {
      const body = await readJson(req);
      if (!body || typeof body !== 'object' || !String(body.title || body.decision || '').trim()) {
        return send(res, 400, { error: 'A decision needs at least a title.' });
      }
      return send(res, 201, { record: await store.save(body) });
    }

    const idMatch = path.match(/^\/api\/decisions\/([\w-]{1,40})$/);
    if (idMatch && req.method === 'GET') {
      const record = await store.get(idMatch[1]);
      return record ? send(res, 200, { record }) : send(res, 404, { error: 'Not found' });
    }
    if (idMatch && req.method === 'DELETE') {
      return (await store.remove(idMatch[1])) ? send(res, 200, { ok: true }) : send(res, 404, { error: 'Not found' });
    }

    return send(res, 404, { error: 'Not found' });
  }

  return createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong.' });
      if (!err.status) console.error(err);
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    const mode = claudeAvailable() ? `Claude mode (${process.env.ANTHROPIC_MODEL || DEFAULT_MODEL})` : 'demo mode (no ANTHROPIC_API_KEY set)';
    console.log(`Decided is running at http://localhost:${port} — ${mode}`);
  });
}

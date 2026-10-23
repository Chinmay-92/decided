// Decision log persisted to a single JSON file (data/decisions.json by default).
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { normaliseRecord } from './extract.js';

export function createStore(file, { seedFile } = {}) {
  let cache = null;

  async function load() {
    if (cache) return cache;
    if (!existsSync(file) && seedFile && existsSync(seedFile)) {
      cache = JSON.parse(await readFile(seedFile, 'utf8')).map(normaliseRecord);
      await persist();
    } else if (existsSync(file)) {
      cache = JSON.parse(await readFile(file, 'utf8'));
    } else {
      cache = [];
    }
    return cache;
  }

  async function persist() {
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(cache, null, 2));
    await rename(tmp, file);
  }

  return {
    async list(query = '') {
      const all = await load();
      const q = query.trim().toLowerCase();
      const hits = q
        ? all.filter((r) => [r.title, r.decision, r.context, ...(r.tags || []), ...(r.participants || [])].join(' ').toLowerCase().includes(q))
        : all;
      return [...hits].sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')));
    },
    async get(id) {
      return (await load()).find((r) => r.id === id) || null;
    },
    async save(input) {
      const all = await load();
      const record = normaliseRecord(input);
      const idx = record.id ? all.findIndex((r) => r.id === record.id) : -1;
      if (idx >= 0) {
        all[idx] = { ...record, createdAt: all[idx].createdAt };
      } else {
        record.id = randomUUID().slice(0, 8);
        record.createdAt = new Date().toISOString();
        all.push(record);
      }
      await persist();
      return idx >= 0 ? all[idx] : record;
    },
    async remove(id) {
      const all = await load();
      const idx = all.findIndex((r) => r.id === id);
      if (idx < 0) return false;
      all.splice(idx, 1);
      await persist();
      return true;
    },
  };
}

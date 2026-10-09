import { open, readFile, rename, mkdir, realpath, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Library, Track } from '../shared/contracts';
export interface StoredTrack extends Track { path: string }
export const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
export class TrackLibrary {
  private entries = new Map<string, StoredTrack>();
  private warning?: string;
  constructor(private directory: string) {}
  get(id: string) { return this.entries.get(id); }
  snapshot(): Library { return {tracks:[...this.entries.values()].map(({id,name})=>({id,name})),warning:this.warning}; }
  async load() {
    try {
      const parsed: unknown = JSON.parse(await readFile(join(this.directory,'library.json'),'utf8'));
      if (!Array.isArray(parsed) || parsed.length > 10000) throw new Error('Invalid library');
      for (const item of parsed) {
        if (!item || typeof item.id !== 'string' || !validId(item.id) || typeof item.path !== 'string' || !isAbsolute(item.path) || extname(item.path).toLowerCase() !== '.mp3') throw new Error('Invalid library entry');
      }
      this.entries = new Map(parsed.map(item=>[item.id,{id:item.id,path:item.path,name:basename(item.path)}]));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') this.warning='The saved library could not be read. Import your MP3 files again.';
    }
  }
  async import(paths: string[]) {
    const next = new Map(this.entries);
    let skipped = 0;
    for (const file of paths) {
      try {
        if (extname(file).toLowerCase() !== '.mp3') { skipped++; continue; }
        const canonical = await realpath(file);
        if (!(await stat(canonical)).isFile()) { skipped++; continue; }
        if ([...next.values()].some(t=>t.path.toLowerCase()===canonical.toLowerCase())) continue;
        if (next.size >= 10000) { skipped++; continue; }
        const id = randomUUID();
        next.set(id,{id,name:basename(canonical),path:canonical});
      } catch { skipped++; }
    }
    await mkdir(this.directory,{recursive:true});
    const temporary = join(this.directory,'library.'+randomUUID()+'.tmp');
    const handle = await open(temporary,'wx');
    try { await handle.writeFile(JSON.stringify([...next.values()],null,2),'utf8'); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary,join(this.directory,'library.json'));
    this.entries = next;
    this.warning=skipped ? skipped+' file(s) could not be imported.' : undefined;
    return this.snapshot();
  }
}
